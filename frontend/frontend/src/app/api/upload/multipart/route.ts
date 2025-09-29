import { NextRequest, NextResponse } from 'next/server'
import { 
  S3Client, 
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3'
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
const MIN_MULTIPART_SIZE = 100 * 1024 * 1024 // 100MB
const MIN_PART_SIZE = 5 * 1024 * 1024 // 5MB minimum part size
const MAX_PART_SIZE = 100 * 1024 * 1024 // 100MB maximum part size for optimal parallelism

function calculateOptimalPartSize(fileSize: number): { partSize: number, totalParts: number } {
  // For maximum parallelism, we want as many parts as possible
  // but within S3's limits (max 10,000 parts, min 5MB per part except last)
  
  const maxParts = 10000
  let partSize = Math.max(MIN_PART_SIZE, Math.ceil(fileSize / maxParts))
  
  // For files up to 10GB, optimize for maximum parallelism
  if (fileSize <= 10 * 1024 * 1024 * 1024) { // 10GB
    // Use smaller parts for better parallelism, but respect minimum
    partSize = Math.max(MIN_PART_SIZE, Math.min(MAX_PART_SIZE, Math.ceil(fileSize / 1000)))
  }
  
  const totalParts = Math.ceil(fileSize / partSize)
  
  return { partSize, totalParts }
}

function getUserIdFromCookie(req: NextRequest): string | undefined {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return undefined
  try {
    // Decode JWT payload without verification (we only need the 'sub')
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
  const { action, fileName, fileType, fileSize, sessionId, fileId, uploadId, parts } = body
    // Derive userId from auth cookie to prevent spoofing
    const authUserId = getUserIdFromCookie(request)

    if (action === 'initiate') {
      return await initiateMultipartUpload(fileName, fileType, fileSize, authUserId, sessionId, fileId)
    } else if (action === 'getPartUrls') {
      return await getPartUploadUrls(uploadId, fileName, fileSize, fileId, authUserId)
    } else if (action === 'complete') {
      return await completeMultipartUpload(uploadId, fileName, parts, fileId, authUserId)
    } else if (action === 'abort') {
      return await abortMultipartUpload(uploadId, fileName, fileId, authUserId)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Multipart upload error:', error)
    return NextResponse.json(
      { error: 'Multipart upload operation failed' },
      { status: 500 }
    )
  }
}

async function initiateMultipartUpload(
  fileName: string,
  fileType: string,
  fileSize: number,
  userId: string | undefined,
  sessionId: string,
  fileId?: string
) {
  if (fileSize < MIN_MULTIPART_SIZE) {
    return NextResponse.json(
      { error: 'File too small for multipart upload' },
      { status: 400 }
    )
  }

  const generatedFileId = fileId || uuidv4()
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  // Store under user UUID folder if available: uploads/{userId}/{fileId}/{fileName}
  const fileKey = userId
    ? `uploads/${userId}/${generatedFileId}/${sanitizedFileName}`
    : `uploads/sessions/${generatedFileId}/${sanitizedFileName}`

  const { partSize, totalParts } = calculateOptimalPartSize(fileSize)

  const command = new CreateMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: fileType,
    Metadata: {
      'original-name': fileName,
      'file-id': generatedFileId,
      'user-id': userId || 'anonymous',
      'session-id': sessionId || '',
      'upload-timestamp': new Date().toISOString(),
      'file-size': fileSize.toString(),
      'part-size': partSize.toString(),
      'total-parts': totalParts.toString(),
    },
  })

  const response = await s3Client.send(command)

  console.log(`Multipart upload initiated:`, {
    uploadId: response.UploadId,
    fileKey,
    fileId: generatedFileId,
    partSize,
    totalParts
  });

  return NextResponse.json({
    uploadId: response.UploadId,
    fileKey,
    fileId: generatedFileId,
    partSize,
    totalParts,
    expiresIn: UPLOAD_EXPIRATION,
  })
}

async function getPartUploadUrls(uploadId: string, fileName: string, fileSize: number, fileId: string, userId?: string) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileKey = userId
    ? `uploads/${userId}/${fileId}/${sanitizedFileName}`
    : `uploads/sessions/${fileId}/${sanitizedFileName}`
  
  console.log(`Getting part URLs for uploadId: ${uploadId}, fileKey: ${fileKey}, fileId: ${fileId}, userId: ${userId}`);

  const { partSize, totalParts } = calculateOptimalPartSize(fileSize)
  
  const partUrls = []
  
  console.log(`Generating ${totalParts} part URLs for upload ${uploadId}, fileKey: ${fileKey}`);
  
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      PartNumber: partNumber,
      UploadId: uploadId,
    })

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: UPLOAD_EXPIRATION,
    })

    partUrls.push({
      partNumber,
      presignedUrl,
    })
  }
  
  console.log(`Generated ${partUrls.length} presigned URLs successfully`);

  return NextResponse.json({
    partUrls,
    partSize,
    totalParts,
  })
}

async function completeMultipartUpload(uploadId: string, fileName: string, parts: Array<{PartNumber: number, ETag: string}>, fileId: string, userId?: string) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileKey = userId
    ? `uploads/${userId}/${fileId}/${sanitizedFileName}`
    : `uploads/sessions/${fileId}/${sanitizedFileName}`

  const command = new CompleteMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  })

  const response = await s3Client.send(command)

  return NextResponse.json({
    location: response.Location,
    bucket: response.Bucket,
    key: response.Key,
    etag: response.ETag,
  })
}

async function abortMultipartUpload(uploadId: string, fileName: string, fileId: string, userId?: string) {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileKey = userId
    ? `uploads/${userId}/${fileId}/${sanitizedFileName}`
    : `uploads/sessions/${fileId}/${sanitizedFileName}`

  const command = new AbortMultipartUploadCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    UploadId: uploadId,
  })

  await s3Client.send(command)

  return NextResponse.json({ success: true })
}