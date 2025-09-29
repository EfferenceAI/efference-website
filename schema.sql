-- PostgreSQL schema for video upload system
-- Replaces DynamoDB table: uploadz-sessions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE video_records (
    video_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_name VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    upload_status VARCHAR(20) NOT NULL CHECK (upload_status IN ('pending', 'completed', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Signature/Release form fields
    signature_status VARCHAR(20) DEFAULT 'none' CHECK (signature_status IN ('none', 'pending', 'signed')),
    documenso_document_id VARCHAR(255),
    release_form_signed_at TIMESTAMP WITH TIME ZONE,
    files JSONB -- For multi-file sessions
);

-- Indexes for performance
CREATE INDEX idx_video_records_user_email ON video_records(user_email);
CREATE INDEX idx_video_records_upload_status ON video_records(upload_status);
CREATE INDEX idx_video_records_created_at ON video_records(created_at);
CREATE INDEX idx_video_records_signature_status ON video_records(signature_status);

-- For compatibility with existing sessionId usage
CREATE INDEX idx_video_records_video_id ON video_records(video_id);