import { NextRequest, NextResponse } from 'next/server'
import { backendApi, CreateVideoSessionFromUpload } from '@/lib/backend-api'
import { createVideoRecord, VideoRecord, initializeDatabase } from '@/lib/postgres'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
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
    const backendSessions = []

    // Create sessions in both frontend and backend databases
    for (const file of files) {
      const sessionId = uuidv4()
      
      // Create frontend video record (for compatibility)
      const videoRecord: VideoRecord = {
        sessionId,
        videoId: sessionId,
        videoName: file.name,
        userName: userName || 'Demo User',
        userEmail: userEmail || 'demo@efference.ai',
        s3Key: '',
        s3Bucket: process.env.S3_BUCKET_NAME || 'uploadz-videos',
        fileSize: file.size,
        contentType: file.type,
        uploadStatus: 'pending',
        uploadedAt: now,
        createdAt: now,
        updatedAt: now,
        signatureStatus: 'none',
        files: files 
      }
      
      await createVideoRecord(videoRecord)
      videoRecords.push(videoRecord)

      // Create backend session
      try {
        const backendSessionData: CreateVideoSessionFromUpload = {
          video_name: file.name,
          user_email: userEmail || 'demo@efference.ai',
          file_size: file.size,
          content_type: file.type,
          s3_bucket: process.env.S3_BUCKET_NAME || 'uploadz-videos',
        }

        const backendSession = await backendApi.createVideoSessionFromUpload(backendSessionData)
        backendSessions.push(backendSession)
        
        console.log(`Created backend session: ${backendSession.session_id} for ${file.name}`)
      } catch (backendError) {
        console.error('Failed to create backend session:', backendError)
        // Continue with frontend-only session for now
      }
      
      console.log(`Created session: ${sessionId} for ${file.name}`)
    }

    return NextResponse.json({
      status: 'created',
      videos: videoRecords,
      backendSessions: backendSessions,
      message: `Created ${videoRecords.length} frontend sessions and ${backendSessions.length} backend sessions`
    })

  } catch (error) {
    console.error('Error creating video records:', error)
    return NextResponse.json(
      { error: 'Failed to create video records', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Test both frontend and backend database connections
    console.log('🔄 API GET: Testing database connections...')
    
    // Frontend database test
    const { testConnection } = await import('@/lib/postgres')
    const frontendConnected = await testConnection()
    
    // Backend API test
    const backendHealth = await backendApi.healthCheck()
    const backendStatus = typeof backendHealth === 'object' && backendHealth !== null && 'status' in backendHealth 
      ? (backendHealth as { status: string }).status 
      : 'unknown'
    
    return NextResponse.json({
      message: 'Video upload API ready - Frontend + Backend integration',
      frontend_database: frontendConnected ? 'connected' : 'disconnected',
      backend_api: backendStatus,
      timestamp: new Date().toISOString(),
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlMasked: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'),
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
    })
  } catch (error) {
    console.error('API GET Error:', error)
    return NextResponse.json({
      message: 'Video upload API ready - with errors',
      frontend_database: 'error',
      backend_api: 'error',
      error: error instanceof Error ? error.message : String(error),
      hasDbUrl: !!process.env.DATABASE_URL
    })
  }
}