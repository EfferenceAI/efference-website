import boto3
from botocore.exceptions import ClientError
from app.config import settings
#from fastapi import BackgroundTasks


def send_email(to_address: str, subject: str, body: str) -> bool:
    """Send an email using AWS SES"""
    if not settings.SES_FROM_EMAIL:
        print("SES_FROM_EMAIL is not configured.")
        print(f"To: {to_address}, Subject: {subject}, Body: {body}")
        return False
    

    s_client = boto3.client('ses', region_name=settings.AWS_REGION)
    try:
        response = s_client.send_email(
            Source=settings.SES_FROM_EMAIL,
            Destination={'ToAddresses': [to_address]},
            Message=
            {
                "Body": {
                    "Html": {
                        "Charset": "UTF-8",
                        "Data": body,
                    },
                }
            }
        )
    except ClientError as e:
        print(f"Failed to send email: {e.response['Error']['Message']}")
        return False