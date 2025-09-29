import { NextRequest, NextResponse } from 'next/server'
import { getVideoRecord, updateVideoRecord } from '@/lib/postgres'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const video = await getVideoRecord(sessionId)

    if (!video) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Retrieved session: ${sessionId}`)
    return NextResponse.json(video)
  } catch (error) {
    console.error('❌ Error getting session:', error)
    return NextResponse.json(
      { error: 'Failed to get session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const updates = await request.json()

    console.log(`🔄 Updating session: ${sessionId}`, Object.keys(updates))

    // Update the video record using Postgres
    await updateVideoRecord(sessionId, updates)

    console.log(`✅ Session updated successfully: ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      sessionId,
      updatedFields: Object.keys(updates)
    })
  } catch (error) {
    console.error('❌ Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}