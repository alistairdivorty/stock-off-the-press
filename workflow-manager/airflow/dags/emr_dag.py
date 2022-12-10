import os
from datetime import datetime
from urllib.parse import urlunsplit, urlencode
import boto3
from airflow.models.baseoperator import chain
from airflow.models.dag import DAG
from airflow.providers.amazon.aws.operators.emr import EmrServerlessStartJobOperator
from airflow.providers.amazon.aws.sensors.emr import EmrServerlessJobSensor

DAG_ID = "EMR_Serverless_ML_Pipeline"

client = boto3.client("cloudformation")

get_stack_outputs = lambda stack_name: client.describe_stacks(StackName=stack_name)[
    "Stacks"
][0]["Outputs"]

docdb_stack_outputs = get_stack_outputs("DocDBStack")
emrs_stack_outputs = get_stack_outputs("EMRServerlessStack")

get_stack_output_value = lambda stack_outputs, export_name: next(
    o for o in stack_outputs if o["ExportName"] == export_name
)["OutputValue"]

docdb_stack_output_value = lambda export_name: get_stack_output_value(
    docdb_stack_outputs, export_name
)
emrs_stack_output_value = lambda export_name: get_stack_output_value(
    emrs_stack_outputs, export_name
)

with DAG(
    dag_id=DAG_ID,
    schedule=None,
    start_date=datetime(2021, 1, 1),
    tags=["EMR"],
    catchup=False,
) as dag:
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

    SPARK_JOB_DRIVER = {
        "sparkSubmit": {
            "entryPoint": os.path.join(
                emrs_stack_output_value("JobsURI"),
                "summarization.py",
            ),
            "entryPointArguments": [],
            "sparkSubmitParameters": f"--conf spark.archives={os.path.join(emrs_stack_output_value('ArtifactsURI'), 'packages.tar.gz#environment')}\
                --conf spark.jars={os.path.join(emrs_stack_output_value('ArtifactsURI'), 'uber-JAR.jar')}\
                --files={os.path.join(emrs_stack_output_value('ConfigsURI'), 'models.json')}\
                --conf spark.emr-serverless.driverEnv.PYSPARK_DRIVER_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.driverEnv.PYSPARK_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.executorEnv.PYSPARK_PYTHON=./environment/bin/python\
                --conf spark.emr-serverless.driver.disk=30g\
                --conf spark.emr-serverless.executor.disk=30g\
                --conf spark.executor.instances=1\
                --conf spark.dynamicAllocation.enabled=false\
                --conf spark.mongodb.input.uri={db_connection_uri}\
                --conf spark.mongodb.output.uri={db_connection_uri}\
                --conf spark.kryoserializer.buffer.max=2000M",
        }
    }

    SPARK_CONFIGURATION_OVERRIDES = {
        "monitoringConfiguration": {
            "s3MonitoringConfiguration": {"logUri": emrs_stack_output_value("LogsURI")}
        }
    }

    application_id = emrs_stack_output_value("ApplicationID")

    start_job = EmrServerlessStartJobOperator(
        task_id="start_emr_serverless_job",
        application_id=application_id,
        execution_role_arn=emrs_stack_output_value("JobRoleARN"),
        job_driver=SPARK_JOB_DRIVER,
        configuration_overrides=SPARK_CONFIGURATION_OVERRIDES,
    )

    wait_for_job = EmrServerlessJobSensor(
        task_id="wait_for_job",
        application_id=application_id,
        job_run_id=start_job.output,
    )

    chain(
        start_job,
        wait_for_job,
    )
