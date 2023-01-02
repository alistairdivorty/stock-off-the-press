import json
import boto3

client = boto3.client("s3")


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
    response = client.copy_object(
        Bucket=event["ResourceProperties"]["Bucket"],
        CopySource=event["ResourceProperties"]["CopySource"],
        Key=event["ResourceProperties"]["Key"],
    )

    attributes = {"Response": json.dumps(response, default=str)}

    return {"Data": attributes}


def on_update(event):
    physical_id = event["PhysicalResourceId"]

    response = client.copy_object(
        Bucket=event["ResourceProperties"]["Bucket"],
        CopySource=event["ResourceProperties"]["CopySource"],
        Key=event["ResourceProperties"]["Key"],
    )

    attributes = {"Response": json.dumps(response, default=str)}

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
