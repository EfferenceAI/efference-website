from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # AWS Configuration
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_default_region: str = "us-east-1"
    
    # S3 Configuration
    s3_bucket_name: str = "efference-vlm"
    s3_dataset_prefix: str = "vlm/dataset_test_s3"
    
    # CloudFront Configuration (optional)
    cloudfront_domain: str = ""
    cloudfront_key_pair_id: str = ""
    cloudfront_private_key_path: str = ""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Security
    presigned_url_expiration: int = 3600
    
    class Config:
        env_file = ".env"

settings = Settings()