// Backend API client for communicating with the FastAPI backend
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

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

interface CreateVideoSessionFromUpload {
  video_name: string;
  user_email: string;
  file_size: number;
  content_type: string;
  s3_bucket?: string;
  task_id?: string;
  creator_id?: string;
}

class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Video Sessions
  async createVideoSessionFromUpload(sessionData: CreateVideoSessionFromUpload): Promise<BackendVideoSession> {
    return this.request<BackendVideoSession>('/sessions/upload', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async getVideoSession(sessionId: string): Promise<BackendVideoSession> {
    return this.request<BackendVideoSession>(`/sessions/${sessionId}`);
  }

  async updateVideoSession(sessionId: string, updates: Partial<BackendVideoSession>): Promise<BackendVideoSession> {
    return this.request<BackendVideoSession>(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async listVideoSessions(): Promise<BackendVideoSession[]> {
    return this.request<BackendVideoSession[]>('/sessions/');
  }

  // Upload endpoints
  async generatePresignedUrl(data: {
    session_id: string;
    filename: string;
    content_type: string;
    part_number: number;
  }) {
    return this.request('/upload/presigned-url', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeUpload(data: {
    session_id: string;
    s3_key: string;
    part_number: number;
    filesize_bytes?: number;
  }) {
    return this.request('/upload/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck() {
    try {
      return await this.request('/health');
    } catch (error) {
      console.error('Backend health check failed:', error);
      return { status: 'error', error: String(error) };
    }
  }
}

export const backendApi = new BackendApiClient();
export type { BackendVideoSession, CreateVideoSessionFromUpload };