import { NextRequest, NextResponse } from 'next/server'
import { createVideoRecord, VideoRecord } from '@/lib/dynamodb'
import { v4 as uuidv4 } from 'uuid'

export async function POST() {
  try {
    console.log('Testing DynamoDB connection...')
    
    const videoId = `test-${uuidv4()}`
    const testVideo: VideoRecord = {
      videoId,
      videoName: 'test-video.mp4',
      userName: 'Test User',
      userEmail: 'test@example.com',
      s3Key: 'test/test-video.mp4',
      s3Bucket: 'uploadz-videos',
      fileSize: 1000000,
      contentType: 'video/mp4',
      uploadStatus: 'completed',
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }

    console.log('Creating test video record:', testVideo)
    
    await createVideoRecord(testVideo)
    
    console.log('Test video record created successfully!')

    return NextResponse.json({
      success: true,
      message: 'Test record created successfully',
      videoId,
      testVideo
    })

  } catch (error) {
    console.error('DynamoDB test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'DynamoDB test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'This is the GET endpoint. Use POST to test DynamoDB!',
    instruction: 'Send a POST request to actually test DynamoDB connection',
    env: {
      AWS_REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'Not set',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set',
      S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'Not set'
    }
  })
}