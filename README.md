# Efference Website

A Next.js application with advanced file upload capabilities and document management features.

## Architecture

### Frontend
- **Framework**: Next.js 15.5.2 with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Upload Components**: Custom React dropzone with drag-and-drop support

### Backend
- **API Routes**: Next.js API routes for upload management
- **Database**: AWS RDS PostgreSQL for session and metadata storage
- **File Storage**: AWS S3 with intelligent upload strategies
- **Authentication**: Documenso integration for document workflows

### Infrastructure
- **Cloud Provider**: AWS (S3, RDS PostgreSQL)
- **Regions**: Configurable, defaults to us-east-1
- **File Limits**: Supports files up to 10GB

## File Upload System

### Upload Strategy Selection
The system automatically chooses the optimal upload method based on file size:

- **Small Files (< 100MB)**: Direct presigned URL upload to S3
- **Large Files (>= 100MB)**: S3 multipart upload with parallel processing

### Multipart Upload Features
For files 100MB and larger, the system implements:

- **Intelligent Part Sizing**: Calculates optimal part size for maximum parallelism
- **Concurrent Uploads**: Up to 10 parts upload simultaneously
- **Progress Tracking**: Real-time progress updates across all parts
- **Error Handling**: Individual part retry and failure management
- **Part Optimization**: For 10GB files, creates up to 1000 parts for maximum speed

### Part Size Calculation
```
- Minimum part size: 5MB (S3 requirement)
- Maximum part size: 100MB (for optimal parallelism)
- For files <= 10GB: Optimized for maximum part count
- Respects S3 limit of 10,000 parts per upload
```

## API Endpoints

### Upload Endpoints
- `POST /api/upload/presigned-url` - Single file upload URL generation
- `POST /api/upload/multipart` - Multipart upload management
  - Action: `initiate` - Start multipart upload session
  - Action: `getPartUrls` - Generate presigned URLs for all parts
  - Action: `complete` - Finalize multipart upload
  - Action: `abort` - Cancel multipart upload

### Session Management
- `POST /api/sessions` - Create upload session records
- `PATCH /api/sessions/[sessionId]` - Update session status
- `GET /api/sessions/[sessionId]` - Retrieve session details

### Database Testing
- `GET /api/sessions` - PostgreSQL connection verification

## Database Schema

### PostgreSQL Table: sessions
```sql
CREATE TABLE sessions (
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
```

## File Organization

### S3 Key Structure
```
uploads/
  {userId}/
    {fileId}_{sanitizedFileName}  // User uploads
  sessions/
    {sessionId}/
      {sanitizedFileName}         // Session-based uploads
```

### File Processing
- **Filename Sanitization**: Non-alphanumeric characters replaced with underscores
- **Unique Identifiers**: UUID generation for collision prevention
- **Metadata Storage**: Original filename preserved in S3 metadata

## Configuration

### Environment Variables
Required in `.env.local`:

```bash
# AWS S3
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# PostgreSQL Database (AWS RDS)
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/dbname

# Optional: Documenso Integration
DOCUMENSO_API_KEY=api_key
DOCUMENSO_BASE_URL=https://app.documenso.com
DOCUMENSO_WEBHOOK_SECRET=webhook_secret
```

### AWS Permissions Required
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:CreateMultipartUpload",
        "s3:UploadPart",
        "s3:CompleteMultipartUpload",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

### Database Setup
1. **Create RDS PostgreSQL Instance** in AWS
2. **Configure Security Groups** to allow connections from your application
3. **Create Database** and run the schema creation SQL
4. **Set DATABASE_URL** environment variable with connection string

## Development

### Getting Started
```bash
cd frontend/frontend
npm install
npm run dev
```

### File Upload Testing
1. Start development server
2. Navigate to dashboard page
3. Drop or select files for upload
4. Monitor console for detailed upload progress
5. Check PostgreSQL database for session records
6. Verify files in S3 bucket

### Error Handling
- Upload failures are logged with detailed error information
- Failed parts are retried automatically
- Database records track upload status for recovery
- Presigned URL expiration handled gracefully (1 hour timeout)

## Performance Characteristics

### Upload Speeds
- **Single uploads**: Limited by network bandwidth
- **Multipart uploads**: Near-maximum network utilization through parallelism
- **Large files**: Significant speed improvement over traditional uploads

### Scalability
- **Concurrent users**: Handled by AWS S3 and RDS PostgreSQL scaling
- **File size limits**: Supports up to 10GB per file
- **Part limits**: Up to 10,000 parts per multipart upload (S3 limit)
- **Session tracking**: PostgreSQL provides fast metadata storage with ACID compliance

### Network Optimization
- **Parallel uploads**: 10 concurrent part uploads
- **Intelligent chunking**: Optimal part sizes for maximum throughput
- **Progress feedback**: Real-time updates without blocking uploads
- **Error recovery**: Individual part retry without full upload restart
