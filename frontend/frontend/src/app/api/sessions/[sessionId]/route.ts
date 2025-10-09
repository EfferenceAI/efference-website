import { NextRequest, NextResponse } from 'next/server'

// Backend API configuration
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gm6cgy8uoa.execute-api.us-east-1.amazonaws.com/prod'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Fetch from backend API
    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }
      throw new Error(`Backend API error: ${response.status}`)
    }

    const video = await response.json()
    console.log(`Retrieved session: ${sessionId}`)
    return NextResponse.json(video)
  } catch (error) {
    console.error('Error getting session:', error)
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

    // Get token from request headers
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Update via backend API
    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const updatedSession = await response.json()
    console.log(`Session updated successfully: ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      sessionId,
      updatedFields: Object.keys(updates),
      session: updatedSession
    })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Failed to update session', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}