import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'uploadz-videos'
const UPLOAD_EXPIRATION = 3600 // 1 hour

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileName, fileType, fileSize, userId, sessionId, fileId } = body

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType' },
        { status: 400 }
      )
    }

    // Generate unique file key with user organization
    const generatedFileId = fileId || uuidv4()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = userId 
      ? `uploads/${userId}/${generatedFileId}_${sanitizedFileName}`
      : `uploads/sessions/${sessionId}/${generatedFileId}_${sanitizedFileName}`

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        'original-name': fileName,
        'file-id': generatedFileId,
        'user-id': userId || 'anonymous',
        'session-id': sessionId || '',
        'upload-timestamp': new Date().toISOString(),
      },
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION,
    })

    return NextResponse.json({
      presignedUrl,
      fileKey,
      fileId: generatedFileId,
      expiresIn: UPLOAD_EXPIRATION,
    })

  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'presigned-url-generator',
    timestamp: new Date().toISOString()
  })
}