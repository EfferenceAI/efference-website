# UploadZ - Video Collection MVP

Simple Next.js app for collecting user videos with e-signature release forms. Users drag/drop MP4/WebM files or archives, sign release forms via Documenso, and files auto-upload to S3 with tracking in DynamoDB.

## Tech Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + ShadCN UI
- **Upload Interface**: React Dropzone with drag/drop support
- **Storage**: AWS S3 (presigned URLs) + DynamoDB (session tracking)
- **E-Signature**: Documenso API with email delivery
- **PDF Generation**: jsPDF for release form documents
- **Deployment**: AWS Amplify (zero-config)

## Installation
```bash
cd app
npm install
```

## Environment Variables
```bash
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key  
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
DYNAMODB_TABLE_NAME=upload-sessions

# Documenso API
DOCUMENSO_API_KEY=your_documenso_api_key
DOCUMENSO_BASE_URL=https://app.documenso.com
```

## Architecture Flow
1. **Signature-First**: User provides email/name → Release form sent via Documenso email
2. **Email Verification**: User clicks email link, signs document (verifies email ownership)
3. **Upload Authorization**: Signed status enables file upload interface
4. **S3 Upload**: Files uploaded via presigned URLs with progress tracking
5. **Session Tracking**: All activities logged in DynamoDB with user/file metadata

## DynamoDB Schema
```javascript
// Main table: upload-sessions
{
  sessionId: "uuid-string",           // Partition Key
  userId: "generated-user-id",
  userEmail: "user@example.com", 
  userName: "User Name",
  status: "pending" | "uploaded" | "completed",
  signatureStatus: "pending" | "sent" | "signed",
  documensoEnvelopeId: "doc-id",
  files: [{
    fileId: "uuid",
    originalName: "video.mp4",
    fileSize: 123456789,
    uploadStatus: "pending" | "uploading" | "completed",
    s3Key: "user-id/session-id/file.mp4"
  }],
  totalFiles: 3,
  totalSizeBytes: 987654321,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}

// GSI: userId-index (for user upload history)
// GSI: signatureStatus-index (for admin monitoring)
```

## Development Progress

### ✅ Phase A: Core Upload Infrastructure
- [x] Next.js project setup with TypeScript + Tailwind + ShadCN UI
- [x] AWS S3 bucket configuration with proper CORS policy  
- [x] DynamoDB table creation with GSI indexes
- [x] S3 presigned URL generation API route
- [x] Client-side drag/drop interface with React Dropzone
- [x] File upload progress tracking and S3 integration
- [x] Session management with database persistence

### ✅ Phase B: E-Signature Workflow (Signature-First)
- [x] Documenso API client integration with authentication
- [x] PDF generation using jsPDF for legal release forms
- [x] Email-based signature delivery (email ownership verification)
- [x] Session creation API with user/file metadata
- [x] Signature status tracking and database updates
- [x] Upload authorization flow (sign-first requirement)

### 🔄 Phase C: Status Management & Polish  
- [x] Real-time upload progress indicators
- [x] File status icons (pending/uploading/completed/error)
- [🐛] Fix signature status detection after Documenso completion
- [ ] Add comprehensive error handling and user feedback
- [ ] Create admin dashboard for monitoring uploads/signatures
- [ ] Implement cleanup for incomplete sessions

### 📋 Phase D: Production Deployment
- [x] Environment variable configuration
- [ ] AWS Amplify deployment setup  
- [ ] Production error monitoring and logging
- [ ] Performance optimization for large file handling
- [ ] User analytics and usage tracking

## Current Status

**✅ Working Features:**
- Drag/drop file selection with preview
- Email/name collection for signature requests  
- PDF release form generation with legal content
- Documenso email delivery and document signing
- File upload to S3 with progress tracking
- Database session persistence

**🐛 Known Issues:**
- Signature status not updating from 'sent' to 'signed' after completion
- DynamoDB GSI indexes still in "pending" state (normal during creation)

## Development Commands
```bash
cd app
npm run dev          # Start development server
npm run build        # Production build  
npm run lint         # ESLint checking
```

## Deployment (AWS Amplify)
1. Push code to GitHub repository
2. Connect repo to AWS Amplify console
3. Configure environment variables:
   - AWS credentials (Access Key, Secret, Region)
   - S3 bucket name and DynamoDB table name
   - Documenso API key and base URL
4. Auto-deploy on every push to main branch