-- PostgreSQL Database Setup for Efference Website
-- Run this script on your AWS RDS PostgreSQL instance

-- Create the sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY,
  video_id UUID NOT NULL,
  video_name VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  s3_key VARCHAR(1000) DEFAULT '',
  s3_bucket VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
  signature_status VARCHAR(20) DEFAULT 'none' CHECK (signature_status IN ('none', 'pending', 'signed')),
  documenso_document_id VARCHAR(255),
  video_summary TEXT,
  summary_added_at TIMESTAMPTZ,
  release_form_signed_at TIMESTAMPTZ,
  files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_upload_status ON sessions(upload_status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_video_id ON sessions(video_id);

-- Display table info
\d sessions;

-- Test the table
SELECT 'Database setup complete!' as status;