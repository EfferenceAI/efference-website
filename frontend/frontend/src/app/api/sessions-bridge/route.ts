import { NextRequest, NextResponse } from 'next/server'
import { CreateVideoSessionFromUpload } from '@/lib/backend-api'

interface BackendVideoSession {
  session_id: string;
  creator_id: string;
  task_id: string;
  reviewer_id?: string;
  status: string;
  video_name?: string;
  user_email?: string;
  s3_bucket?: string;
  file_size?: number;
  content_type?: string;
  upload_status?: string;
  signature_status?: string;
  documenso_document_id?: string;
  video_summary?: string;
  summary_added_at?: string;
  release_form_signed_at?: string;
  uploaded_at?: string;
  created_at: string;
  updated_at: string;
}

// Backend API client with token support
class AuthenticatedBackendApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add authorization header if token exists
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async createVideoSessionFromUpload(sessionData: CreateVideoSessionFromUpload): Promise<BackendVideoSession> {
    return this.request<BackendVideoSession>('/sessions/upload', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { files, userEmail, taskId, token } = body

    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Missing required fields: files' },
        { status: 400 }
      )
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      )
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gm6cgy8uoa.execute-api.us-east-1.amazonaws.com/prod'
    const backendApi = new AuthenticatedBackendApiClient(backendUrl, token)
    const backendSessions = []

    // Create sessions ONLY in backend database
    for (const file of files) {
      try {
        const backendSessionData: CreateVideoSessionFromUpload = {
          video_name: file.name,
          user_email: userEmail || 'demo@efference.ai',
          file_size: file.size,
          content_type: file.type,
          s3_bucket: process.env.S3_BUCKET_NAME || 'uploadz-videos',
          task_id: taskId, // Include task ID for backend
        }

        const backendSession = await backendApi.createVideoSessionFromUpload(backendSessionData)
        backendSessions.push(backendSession)
        
        console.log(`Created backend session: ${backendSession.session_id} for ${file.name}`)
      } catch (backendError) {
        console.error('Failed to create backend session:', backendError)
        throw backendError // Don't silently fail - we need backend sessions
      }
    }

    return NextResponse.json({
      status: 'created',
      sessions: backendSessions,
      message: `Created ${backendSessions.length} video sessions in backend database`
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gm6cgy8uoa.execute-api.us-east-1.amazonaws.com/prod'
    
    // Test backend API connection
    const response = await fetch(`${backendUrl}/health`)
    const backendStatus = response.ok ? 'connected' : 'disconnected'
    
    return NextResponse.json({
      message: 'Video session bridge ready - Backend-only mode',
      backend_api: backendStatus,
      timestamp: new Date().toISOString(),
      backendUrl
    })
  } catch (error) {
    console.error('API GET Error:', error)
    return NextResponse.json({
      message: 'Video session bridge - with errors',
      backend_api: 'error',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}