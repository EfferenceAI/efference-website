import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.signers import CloudFrontSigner
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from app.config import settings
from app.models import DatasetInfo, ShardInfo, ManifestInfo, DatasetStructure

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_default_region
            )
        except NoCredentialsError:
            logger.warning("AWS credentials not found. Using default credentials.")
            self.s3_client = boto3.client('s3', region_name=settings.aws_default_region)
        
        # Initialize CloudFront signer if configured
        self.cloudfront_signer = None
        if (settings.cloudfront_domain and 
            settings.cloudfront_key_pair_id and 
            settings.cloudfront_private_key_path):
            try:
                self.cloudfront_signer = self._create_cloudfront_signer()
                logger.info("CloudFront signer initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize CloudFront signer: {e}")
                logger.warning("Falling back to S3 presigned URLs")
    
    async def list_datasets(self) -> List[DatasetInfo]:
        """List all available datasets from S3"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=settings.s3_bucket_name,
                Prefix=f"{settings.s3_dataset_prefix.rstrip('/')}/",
                Delimiter='/'
            )
            
            datasets = []
            if 'CommonPrefixes' in response:
                for prefix in response['CommonPrefixes']:
                    dataset_path = prefix['Prefix'].rstrip('/')
                    dataset_name = dataset_path.split('/')[-1]
                    
                    datasets.append(DatasetInfo(
                        name=dataset_name,
                        path=dataset_path
                    ))
            else:
                # If no subdirectories, check if the prefix itself exists
                if self._prefix_exists(settings.s3_dataset_prefix):
                    dataset_name = settings.s3_dataset_prefix.split('/')[-1]
                    datasets.append(DatasetInfo(
                        name=dataset_name,
                        path=settings.s3_dataset_prefix
                    ))
            
            return datasets
            
        except ClientError as e:
            logger.error(f"Error listing datasets: {e}")
            raise
    
    async def get_dataset_structure(self, dataset_name: str) -> Optional[DatasetStructure]:
        """Get the complete structure of a dataset"""
        try:
            dataset_prefix = f"{settings.s3_dataset_prefix}/{dataset_name}"
            
            # Check if dataset exists
            if not self._prefix_exists(dataset_prefix):
                return None
            
            manifests = await self._list_files_in_prefix(f"{dataset_prefix}/manifests/")
            shards = await self._list_shards(f"{dataset_prefix}/shards/")
            meta_files = await self._list_files_in_prefix(f"{dataset_prefix}/meta/")
            
            return DatasetStructure(
                dataset_name=dataset_name,
                manifests=[self._object_to_manifest_info(obj) for obj in manifests],
                shards=shards,
                meta_files=[self._object_to_shard_info(obj, "meta") for obj in meta_files]
            )
            
        except ClientError as e:
            logger.error(f"Error getting dataset structure for {dataset_name}: {e}")
            raise
    
    async def _list_files_in_prefix(self, prefix: str) -> List[dict]:
        """List all files under a specific prefix"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=settings.s3_bucket_name,
                Prefix=prefix
            )
            
            return response.get('Contents', [])
            
        except ClientError as e:
            logger.error(f"Error listing files in prefix {prefix}: {e}")
            return []
    
    async def _list_shards(self, shards_prefix: str) -> List[ShardInfo]:
        """List all shards organized by type (clip, img, etc.)"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=settings.s3_bucket_name,
                Prefix=shards_prefix
            )
            
            shards = []
            for obj in response.get('Contents', []):
                # Extract shard type from path (e.g., shards/clip/file.tar -> clip)
                path_parts = obj['Key'].replace(shards_prefix, '').split('/')
                if len(path_parts) >= 2:
                    shard_type = path_parts[0]
                    shards.append(self._object_to_shard_info(obj, shard_type))
            
            return shards
            
        except ClientError as e:
            logger.error(f"Error listing shards in {shards_prefix}: {e}")
            return []
    
    def _prefix_exists(self, prefix: str) -> bool:
        """Check if a prefix exists in S3"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=settings.s3_bucket_name,
                Prefix=prefix,
                MaxKeys=1
            )
            return 'Contents' in response
            
        except ClientError:
            return False
    
    def _object_to_manifest_info(self, obj: dict) -> ManifestInfo:
        """Convert S3 object to ManifestInfo"""
        return ManifestInfo(
            name=obj['Key'].split('/')[-1],
            path=obj['Key'],
            size_bytes=obj.get('Size'),
            last_modified=obj.get('LastModified')
        )
    
    def _object_to_shard_info(self, obj: dict, shard_type: str) -> ShardInfo:
        """Convert S3 object to ShardInfo"""
        return ShardInfo(
            name=obj['Key'].split('/')[-1],
            path=obj['Key'],
            type=shard_type,
            size_bytes=obj.get('Size'),
            last_modified=obj.get('LastModified')
        )
    
    def generate_presigned_url(self, file_path: str, expiration: int = 3600) -> str:
        """Generate presigned URL for file download via CloudFront or S3"""
        try:
            if self.cloudfront_signer and settings.cloudfront_domain:
                # Generate CloudFront presigned URL
                return self._generate_cloudfront_url(file_path, expiration)
            else:
                # Fallback to S3 presigned URL
                return self._generate_s3_url(file_path, expiration)
            
        except Exception as e:
            logger.error(f"Error generating presigned URL for {file_path}: {e}")
            raise
    
    def _generate_cloudfront_url(self, file_path: str, expiration: int) -> str:
        """Generate CloudFront presigned URL"""
        # CloudFront URL format
        cloudfront_url = f"https://{settings.cloudfront_domain}/{file_path}"
        
        # Calculate expiration time
        expire_date = datetime.utcnow() + timedelta(seconds=expiration)
        
        # Generate signed URL
        signed_url = self.cloudfront_signer.generate_presigned_url(
            cloudfront_url, 
            date_less_than=expire_date
        )
        
        logger.info(f"Generated CloudFront presigned URL for {file_path}")
        return signed_url
    
    def _generate_s3_url(self, file_path: str, expiration: int) -> str:
        """Generate S3 presigned URL as fallback"""
        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.s3_bucket_name, 'Key': file_path},
            ExpiresIn=expiration
        )
        logger.info(f"Generated S3 presigned URL for {file_path}")
        return url
    
    def _create_cloudfront_signer(self) -> CloudFrontSigner:
        """Create CloudFront signer from private key"""
        if not os.path.exists(settings.cloudfront_private_key_path):
            raise FileNotFoundError(f"CloudFront private key not found: {settings.cloudfront_private_key_path}")
        
        # Read private key
        with open(settings.cloudfront_private_key_path, 'rb') as key_file:
            private_key_data = key_file.read()
        
        # Load private key
        private_key = serialization.load_pem_private_key(
            private_key_data,
            password=None
        )
        
        def rsa_signer(message):
            from cryptography.hazmat.primitives.asymmetric import padding
            signature = private_key.sign(message, padding.PKCS1v15(), hashes.SHA1())
            return signature
        
        return CloudFrontSigner(settings.cloudfront_key_pair_id, rsa_signer)

# Singleton instance
s3_service = S3Service()