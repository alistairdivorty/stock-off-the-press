import json
import boto3
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2 import sql, errors


DuplicateDatabase = errors.lookup("42P04")

sm_client = boto3.client("secretsmanager")


def on_event(event, context):
    print(event)
    request_type = event["RequestType"]
    if request_type == "Create":
        return on_create(event)
    if request_type == "Update":
        return on_update(event)
    if request_type == "Delete":
        return on_delete(event)
    raise Exception("Invalid request type: %s" % request_type)


def on_create(event):
    secret = sm_client.get_secret_value(
        SecretId=event["ResourceProperties"]["secretName"]
    )

    json_ = json.loads(secret["SecretString"])
    user = json_[event["ResourceProperties"]["userKey"]]
    password = json_[event["ResourceProperties"]["passwordKey"]]

    conn = psycopg2.connect(
        user=user,
        password=password,
        host=event["ResourceProperties"]["host"],
        port=event["ResourceProperties"]["port"],
        dbname="postgres",
    )

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    cur = conn.cursor()

    dbname = event["ResourceProperties"]["dbName"]

    try:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname)))
    except DuplicateDatabase:
        response = "Database already exists."
    else:
        response = "Database created."

    attributes = {"Response": response}

    return {"Data": attributes}


def on_update(event):
    secret = sm_client.get_secret_value(
        SecretId=event["ResourceProperties"]["secretName"]
    )

    json_ = json.loads(secret["SecretString"])
    user = json_[event["ResourceProperties"]["userKey"]]
    password = json_[event["ResourceProperties"]["passwordKey"]]

    conn = psycopg2.connect(
        user=user,
        password=password,
        host=event["ResourceProperties"]["host"],
        port=event["ResourceProperties"]["port"],
        dbname="postgres",
    )

    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    cur = conn.cursor()

    physical_id = event["PhysicalResourceId"]
    dbname = event["ResourceProperties"]["dbName"]

    try:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(dbname)))
    except DuplicateDatabase:
        response = "Database already exists."
    else:
        response = "Database created."

    attributes = {"Response": response}

    return {"PhysicalResourceId": physical_id, "Data": attributes}


def on_delete(event):
    physical_id = event["PhysicalResourceId"]
    # ...

    return {"PhysicalResourceId": physical_id}


def is_complete(event, context):
    physical_id = event["PhysicalResourceId"]
    request_type = event["RequestType"]

    # check if resource is stable based on request_type
    # is_ready = ...

    return {"IsComplete": True}
