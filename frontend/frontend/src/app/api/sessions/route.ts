import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { createVideoRecord, VideoRecord, initializeDatabase } from '@/lib/postgres'

// Create video records for upload using Postgres
export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    await initializeDatabase()

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
      const sessionId = uuidv4()
      const videoRecord: VideoRecord = {
        sessionId,          // Primary key
        videoId: sessionId, // Same as sessionId for compatibility
        videoName: file.name,
        userName: userName || 'Demo User',
        userEmail: userEmail || 'demo@efference.ai',
        s3Key: '', // Will be updated when upload completes
        s3Bucket: process.env.S3_BUCKET_NAME || 'uploadz-videos',
        fileSize: file.size,
        contentType: file.type,
        uploadStatus: 'pending',
        uploadedAt: now,
        createdAt: now,
        updatedAt: now,
        
        // Initialize signature fields
        signatureStatus: 'none',
        files: files // Store all files for signature form
      }
      
      await createVideoRecord(videoRecord)
      videoRecords.push(videoRecord)
      
      console.log(`✅ Created session: ${sessionId} for ${file.name}`)
    }

    return NextResponse.json({
      status: 'created',
      videos: videoRecords
    })

  } catch (error) {
    console.error('❌ Error creating video records:', error)
    return NextResponse.json(
      { error: 'Failed to create video records', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Simple GET endpoint with database status
export async function GET() {
  try {
    // Test database connection
    console.log('🔄 API GET: Testing database connection...')
    const { testConnection } = await import('@/lib/postgres')
    const isConnected = await testConnection()
    
    return NextResponse.json({
      message: 'Video upload API ready',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlMasked: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')
    })
  } catch (error) {
    console.error('🔥 API GET Error:', error)
    return NextResponse.json({
      message: 'Video upload API ready',
      database: 'error',
      error: error instanceof Error ? error.message : String(error),
      hasDbUrl: !!process.env.DATABASE_URL
    })
  }
}