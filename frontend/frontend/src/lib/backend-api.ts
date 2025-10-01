// Backend API client for communicating with the FastAPI backend
import 'server-only';

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

interface Task {
  task_id: string;
  title: string;
  description?: string;
  created_at: string;
  created_by_id: string;
  is_active: boolean;
}

interface TaskCreate {
  title: string;
  description?: string;
  is_active?: boolean;
}

interface TaskAssignment {
  assignment_id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  task?: Task;
  user?: {
    user_id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
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
    
    // Get authentication token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add authorization header if token exists
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
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

  // Task management
  async createTask(taskData: TaskCreate): Promise<Task> {
    return this.request<Task>('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async getTasks(params?: {
    skip?: number;
    limit?: number;
    created_by_id?: string;
  }): Promise<Task[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.created_by_id) queryParams.append('created_by_id', params.created_by_id);
    
    const queryString = queryParams.toString();
    return this.request<Task[]>(`/tasks/${queryString ? `?${queryString}` : ''}`);
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`);
  }

  async updateTask(taskId: string, updates: Partial<TaskCreate>): Promise<Task> {
    return this.request<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Task assignments
  async getTaskAssignments(taskId?: string, userId?: string): Promise<TaskAssignment[]> {
    const queryParams = new URLSearchParams();
    if (taskId) queryParams.append('task_id', taskId);
    if (userId) queryParams.append('user_id', userId);
    
    const queryString = queryParams.toString();
    return this.request<TaskAssignment[]>(`/tasks/assignments${queryString ? `?${queryString}` : ''}`);
  }

  async createTaskAssignment(taskId: string, userId?: string): Promise<TaskAssignment> {
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append('user_id', userId);
    
    const queryString = queryParams.toString();
    return this.request<TaskAssignment>(`/tasks/${taskId}/assignments${queryString ? `?${queryString}` : ''}`, {
      method: 'POST',
    });
  }

  async deleteTaskAssignment(assignmentId: string): Promise<void> {
    return this.request<void>(`/tasks/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  // User management
  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: string;
  }): Promise<User[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.role) queryParams.append('role', params.role);
    
    const queryString = queryParams.toString();
    return this.request<User[]>(`/users/${queryString ? `?${queryString}` : ''}`);
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }
}

export const backendApi = new BackendApiClient();
export type { BackendVideoSession, CreateVideoSessionFromUpload, Task, TaskCreate, TaskAssignment, User };