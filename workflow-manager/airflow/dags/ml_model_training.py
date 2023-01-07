import os
from datetime import datetime
from urllib.parse import urlunsplit, urlencode
import boto3
from airflow.models.baseoperator import chain
from airflow.models.dag import DAG
from airflow.providers.amazon.aws.operators.emr import EmrServerlessStartJobOperator
from airflow.providers.amazon.aws.sensors.emr import EmrServerlessJobSensor
from airflow.providers.amazon.aws.operators.ecs import EcsRunTaskOperator


DAG_ID = "ML_Model_Training"

client = boto3.client("cloudformation")

get_stack_outputs = lambda stack_name: client.describe_stacks(StackName=stack_name)[
    "Stacks"
][0]["Outputs"]

docdb_stack_outputs = get_stack_outputs("DocDBStack")
emrs_stack_outputs = get_stack_outputs("EMRServerlessStack")
crawler_stack_outputs = get_stack_outputs("CrawlerStack")

get_stack_output_value = lambda stack_outputs, export_name: next(
    o for o in stack_outputs if o.get("ExportName") == export_name
)["OutputValue"]

docdb_stack_output_value = lambda export_name: get_stack_output_value(
    docdb_stack_outputs, export_name
)
emrs_stack_output_value = lambda export_name: get_stack_output_value(
    emrs_stack_outputs, export_name
)
crawler_stack_output_value = lambda export_name: get_stack_output_value(
    crawler_stack_outputs, export_name
)


def spark_job_driver(
    job_name: str,
    entry_point_args: list = [],
    config_names: list = ["models"],
    driver_cores: int = 4,
    driver_memory: int = 14,
    driver_disk: int = 30,
    executor_cores: int = 4,
    executor_memory: int = 14,
    executor_disk: int = 30,
    executor_instances: int = 1,
    dynamic_allocation_enabled: bool = False,
) -> dict:
    db_connection_uri = urlunsplit(
        (
            "mongodb",
            f"{os.environ['DB_MASTER_USERNAME']}:{os.environ['DB_MASTER_USER_PASSWORD']}@{docdb_stack_output_value('DocDBEndpoint')}:{docdb_stack_output_value('DocDBPort')}",
            os.environ["DB_DATABASE_NAME"],
            urlencode(
                dict(
                    replicaSet="rs0",
                    readPreference="secondaryPreferred",
                    retryWrites="false",
                )
            ),
            "",
        )
    )

    files = ",".join(
        os.path.join(emrs_stack_output_value("ConfigsURI"), f"{config_name}.json")
        for config_name in config_names
    )

    return {
        "sparkSubmit": {
            "entryPoint": os.path.join(
                emrs_stack_output_value("JobsURI"),
                f"{job_name}.py",
            ),
            "entryPointArguments": entry_point_args,
            "sparkSubmitParameters": f"--archives {os.path.join(emrs_stack_output_value('ArtifactsURI'), 'packages.tar.gz#environment')}\
                --jars {os.path.join(emrs_stack_output_value('ArtifactsURI'), 'uber-JAR.jar')}\
                --files {files}\
                --conf spark.emr-serverless.driverEnv.PYSPARK_DRIVER_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.driverEnv.PYSPARK_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.executorEnv.PYSPARK_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.driver.cores={driver_cores}\
                --conf spark.driver.memory={driver_memory}g\
                --conf spark.emr-serverless.driver.disk={driver_disk}g\
                --conf spark.emr-serverless.executor.cores={executor_cores}\
                --conf spark.executor.memory={executor_memory}g\
                --conf spark.emr-serverless.executor.disk={executor_disk}g\
                --conf spark.executor.instances={executor_instances}\
                --conf spark.dynamicAllocation.enabled={str(dynamic_allocation_enabled).lower()}\
                --conf spark.mongodb.input.uri={db_connection_uri}\
                --conf spark.mongodb.output.uri={db_connection_uri}\
                --conf spark.kryoserializer.buffer.max=2000M",
        }
    }


with DAG(
    dag_id=DAG_ID,
    schedule=None,
    start_date=datetime(2021, 1, 1),
    tags=["EMR"],
    catchup=False,
) as dag:
    SPARK_CONFIGURATION_OVERRIDES = {
        "monitoringConfiguration": {
            "s3MonitoringConfiguration": {"logUri": emrs_stack_output_value("LogsURI")}
        }
    }

    application_id = emrs_stack_output_value("ApplicationID")

    start_summarization_job = EmrServerlessStartJobOperator(
        task_id="start_summarization_job",
        application_id=application_id,
        execution_role_arn=emrs_stack_output_value("JobRoleARN"),
        job_driver=spark_job_driver("summarization"),
        configuration_overrides=SPARK_CONFIGURATION_OVERRIDES,
    )

    wait_for_summarization_job = EmrServerlessJobSensor(
        task_id="wait_for_summarization_job",
        application_id=application_id,
        job_run_id=start_summarization_job.output,
    )

    start_ner_job = EmrServerlessStartJobOperator(
        task_id="start_ner_job",
        application_id=application_id,
        execution_role_arn=emrs_stack_output_value("JobRoleARN"),
        job_driver=spark_job_driver(
            "ner",
            entry_point_args=["--similarity-threshold", "50"],
            driver_memory=20,
            driver_disk=30,
            executor_instances=2,
            executor_memory=20,
            executor_disk=30,
        ),
        configuration_overrides=SPARK_CONFIGURATION_OVERRIDES,
    )

    wait_for_ner_job = EmrServerlessJobSensor(
        task_id="wait_for_ner_job",
        application_id=application_id,
        job_run_id=start_ner_job.output,
    )

    start_knn_job = EmrServerlessStartJobOperator(
        task_id="start_knn_job",
        application_id=application_id,
        execution_role_arn=emrs_stack_output_value("JobRoleARN"),
        job_driver=spark_job_driver(
            "knn",
            entry_point_args=["--similarity-threshold", "0.3", "--num-partitions", "2"],
            executor_instances=2,
        ),
        configuration_overrides=SPARK_CONFIGURATION_OVERRIDES,
    )

    wait_for_knn_job = EmrServerlessJobSensor(
        task_id="wait_for_knn_job",
        application_id=application_id,
        job_run_id=start_knn_job.output,
    )

    run_price_task = EcsRunTaskOperator(
        task_id="run_price_task",
        cluster=crawler_stack_output_value("ClusterName"),
        task_definition=crawler_stack_output_value("PriceTaskDefinitionName"),
        launch_type="FARGATE",
        overrides={
            "containerOverrides": [
                {
                    "name": "container-price",
                    "command": [
                        "sh",
                        "-c",
                        "python3 ./crawler/scripts/fetch_prices.py",
                    ],
                },
            ],
        },
        network_configuration={
            "awsvpcConfiguration": {
                "subnets": crawler_stack_output_value("PublicSubnets").split(","),
                "securityGroups": [
                    crawler_stack_output_value("PriceFargateServiceSecurityGroup")
                ],
                "assignPublicIp": "ENABLED",
            },
        },
    )

    start_vectorization_job = EmrServerlessStartJobOperator(
        task_id="start_vectorization_job",
        application_id=application_id,
        execution_role_arn=emrs_stack_output_value("JobRoleARN"),
        job_driver=spark_job_driver(
            "vectorization",
            entry_point_args=["--data-dest-path", emrs_stack_output_value("DataURI")],
            executor_instances=2,
        ),
        configuration_overrides=SPARK_CONFIGURATION_OVERRIDES,
    )

    wait_for_vectorization_job = EmrServerlessJobSensor(
        task_id="wait_for_vectorization_job",
        application_id=application_id,
        job_run_id=start_vectorization_job.output,
    )

    chain(
        start_summarization_job,
        wait_for_summarization_job,
        start_ner_job,
        wait_for_ner_job,
        start_knn_job,
        wait_for_knn_job,
        run_price_task,
        start_vectorization_job,
        wait_for_vectorization_job,
    )
