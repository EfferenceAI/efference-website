import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'uploadz-videos'
const UPLOAD_EXPIRATION = 3600 // 1 hour

// In non-production, allow a mock response if AWS env is not configured
function shouldMockUploads(): boolean {
  if (process.env.NODE_ENV === 'production') return false
  return !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME
}

const s3Client = new S3Client({
  region: REGION,
  credentials: ACCESS_KEY_ID && SECRET_ACCESS_KEY ? {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  } : undefined,
})

function getUserIdFromCookie(req: NextRequest): string | undefined {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return undefined
  try {
    // Decode JWT payload without verification (only need the 'sub')
    const parts = token.split('.')
    if (parts.length < 2) return undefined
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
    const sub = payload?.sub
    return typeof sub === 'string' ? sub : undefined
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, fileName, fileType, fileSize, s3Key: providedS3Key } = body as {
      fileId?: string
      fileName: string
      fileType: string
      fileSize?: number
      s3Key?: string
    }

    if (!fileName || !fileType) {
      return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 })
    }

    const userId = getUserIdFromCookie(request)
    const generatedFileId = fileId || uuidv4()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Prefer explicitly provided s3Key (for workflows that precompute a path)
    // Otherwise, store under user UUID if available
    const fileKey = providedS3Key && typeof providedS3Key === 'string' && providedS3Key.length > 0
      ? providedS3Key
      : userId
        ? `uploads/${userId}/${generatedFileId}/${sanitizedFileName}`
        : `uploads/sessions/${generatedFileId}/${sanitizedFileName}`

    // Development mock: allow UI to simulate uploads without AWS config
    if (shouldMockUploads()) {
      return NextResponse.json({
        presignedUrl: 'https://example.com/mock-upload',
        fileKey,
        fileId: generatedFileId,
        expiresIn: UPLOAD_EXPIRATION,
        isDevelopmentMock: true,
      })
    }

    // Generate presigned URL for single PUT upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
      Metadata: {
        'original-name': fileName,
        'file-id': generatedFileId,
        'user-id': userId || 'anonymous',
        'upload-timestamp': new Date().toISOString(),
        ...(fileSize ? { 'file-size': String(fileSize) } : {}),
      },
    })

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: UPLOAD_EXPIRATION })

    return NextResponse.json({
      presignedUrl,
      fileKey,
      fileId: generatedFileId,
      expiresIn: UPLOAD_EXPIRATION,
    })
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 })
  }
}
