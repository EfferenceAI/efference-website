'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, User } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface VideoSession {
  session_id: string;
  creator_id: string;
  task_id: string;
  reviewer_id?: string;
  status: string;
  raw_concatenated_s3_key?: string;
  processed_1080p_s3_key?: string;
  created_at: string;
  updated_at: string;
  creator?: User;
  task?: {
    task_id: string;
    title: string;
    description: string;
  };
  reviewer?: User;
}

export default function GalleryPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getMe();
      if (!user) {
        router.replace('/login');
        return;
      }
      setMe(user);
      setAuthChecked(true);
      
      // Load user's video sessions
      try {
        let sessions: VideoSession[] = [];
        if (user.role === 'ADMIN') {
          sessions = await apiFetch<VideoSession[]>('/sessions');
        } else {
          sessions = await apiFetch<VideoSession[]>(`/sessions/?creator_id=${user.user_id}`);
        }
        setVideoSessions(sessions);
      } catch (error) {
        console.error('Failed to load video sessions:', error);
        setVideoSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const VideoSessionCard = ({ session }: { session: VideoSession }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'PENDING':
          return 'bg-yellow-100 text-yellow-800';
        case 'PROCESSING':
          return 'bg-blue-100 text-blue-800';
        case 'READY_FOR_REVIEW':
          return 'bg-purple-100 text-purple-800';
        case 'COMPLETED':
          return 'bg-green-100 text-green-800';
        case 'REJECTED':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-[#111111]">
              {session.task?.title || `Task ${session.task_id.slice(0, 8)}`}
            </h3>
            <p className="text-sm text-[#666] mt-1">
              {session.task?.description || 'No description available'}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
            {session.status}
          </span>
        </div>
        
        <div className="text-xs text-[#666] space-y-1">
          <div>Created: {formatDate(session.created_at)}</div>
          <div>Updated: {formatDate(session.updated_at)}</div>
          {session.reviewer && (
            <div>Reviewer: {session.reviewer.name}</div>
          )}
        </div>

        {session.processed_1080p_s3_key && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-[#A2AF9B]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              Video processed and ready
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center">
        <p className="text-[#666]">Loading...</p>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF9EE]">
      {/* Header */}
      <header className="bg-white border-b border-[#DCCFC0] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Video Gallery</h1>
            <p className="text-[#666] mt-1">View and manage your uploaded videos</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#A2AF9B] text-white px-4 py-2 rounded-lg hover:bg-[#8B9B8C] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
              <p className="text-[#666]">Loading videos...</p>
            </div>
          ) : videoSessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6 text-center">
              <p className="text-[#666] mb-4">You haven&apos;t uploaded any videos yet.</p>
              <button
                onClick={() => router.push('/upload')}
                className="bg-[#A2AF9B] text-white px-6 py-3 rounded-lg hover:bg-[#8B9B8C] transition-colors"
              >
                Upload Your First Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videoSessions.map((session) => (
                <VideoSessionCard key={session.session_id} session={session} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}