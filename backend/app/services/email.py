import boto3
from botocore.exceptions import ClientError
from app.config import settings
#from fastapi import BackgroundTasks


def get_s3_client():
    """Get an S3 client using boto3"""
    return boto3.client('s3', region_name="us-east-1")

def send_email(to_address: str, subject: str, body: str) -> bool:
    """Send an email using AWS SES"""
    if not settings.SES_FROM_EMAIL:
        print("SES_FROM_EMAIL is not configured.")
        print(f"To: {to_address}, Subject: {subject}, Body: {body}")
        return False
    

    s_client = boto3.client("ses", region_name="us-east-1")
    try:
        response = s_client.send_email(
            Source=settings.SES_FROM_EMAIL,
            Destination={"ToAddresses": [to_address]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Html": {"Data": body}}
            }
        )
    except ClientError as e:
        print(f"Failed to send email: {e.response['Error']['Message']}")
        return False
    else:
        # print(f"SES MessageId: {response.get('MessageId')}")
        return True