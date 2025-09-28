import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createVideoRecord, VideoRecord } from '@/lib/dynamodb'

// Create video records for upload
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, userEmail, userName } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Missing required fields: files' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const videoRecords: VideoRecord[] = []

    // Create one record per video file
    for (const file of files) {
      const videoId = uuidv4()
      const videoRecord: VideoRecord = {
        videoId,
        videoName: file.name,
        userName: userName || 'Demo User',
        userEmail: userEmail || 'demo@efference.ai',
        s3Key: '', // Will be updated when upload completes
        s3Bucket: process.env.S3_BUCKET_NAME || 'uploadz-videos',
        fileSize: file.size,
        contentType: file.type,
        uploadStatus: 'pending',
        uploadedAt: now,
        createdAt: now
      }
      
      await createVideoRecord(videoRecord)
      videoRecords.push(videoRecord)
    }

    return NextResponse.json({
      status: 'created',
      videos: videoRecords
    })

  } catch (error) {
    console.error('Error creating video records:', error)
    return NextResponse.json(
      { error: 'Failed to create video records' },
      { status: 500 }
    )
  }
}

// Simple GET endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Video upload API ready'
  })
}