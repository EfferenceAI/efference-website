from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DatasetInfo(BaseModel):
    name: str
    path: str
    created_at: Optional[datetime] = None
    size_bytes: Optional[int] = None

class ShardInfo(BaseModel):
    name: str
    path: str
    type: str  # 'clip', 'img', etc.
    size_bytes: Optional[int] = None
    last_modified: Optional[datetime] = None

class ManifestInfo(BaseModel):
    name: str
    path: str
    size_bytes: Optional[int] = None
    last_modified: Optional[datetime] = None

class PresignedUrlRequest(BaseModel):
    file_path: str
    expires_in: Optional[int] = 3600  # 1 hour default

class PresignedUrlResponse(BaseModel):
    url: str
    expires_at: datetime
    file_path: str

class DatasetStructure(BaseModel):
    dataset_name: str
    manifests: List[ManifestInfo]
    shards: List[ShardInfo]
    meta_files: List[ShardInfo]