import os
from datetime import datetime
from airflow import DAG
from airflow.models.baseoperator import chain
from airflow.providers.amazon.aws.hooks.ecs import EcsTaskStates
from airflow.providers.amazon.aws.operators.ecs import EcsRunTaskOperator
from airflow.providers.amazon.aws.sensors.ecs import EcsTaskStateSensor

DAG_ID = "ECS_Fargate_Test"


with DAG(
    dag_id=DAG_ID,
    schedule=None,
    start_date=datetime(2021, 1, 1),
    tags=["ECS"],
    catchup=False,
) as dag:
    run_task = EcsRunTaskOperator(
        task_id="run_task",
        cluster=os.environ["CLUSTER"],
        task_definition="FarFlowHelloTask",
        launch_type="FARGATE",
        overrides={
            "containerOverrides": [
                {
                    "name": "hello",
                    "command": ["python", "app.py", "Hello from DAG"],
                },
            ],
        },
        network_configuration={
            "awsvpcConfiguration": {
                "securityGroups": [os.environ["SECURITY_GROUP"]],
                "subnets": os.environ["SUBNETS"].split(","),
                "assignPublicIp": "DISABLED",
            }
        },
        awslogs_group="FarFlowDagTaskLogs",
        awslogs_region="eu-west-1",
        awslogs_stream_prefix="FarFlowDagTaskLogging/hello",
        # You must set `reattach=True` in order to get ecs_task_arn if you plan to use a Sensor.
        reattach=True,
    )

    run_task.wait_for_completion = False

    await_task_finish = EcsTaskStateSensor(
        task_id="await_task_finish",
        cluster=os.environ["CLUSTER"],
        task=run_task.output["ecs_task_arn"],
        target_state=EcsTaskStates.STOPPED,
        failure_states={EcsTaskStates.NONE},
    )

    chain(
        run_task,
        await_task_finish,
    )
