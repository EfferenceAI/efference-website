'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '../components/UploadDropzone';
import TaskManagement from '../components/TaskManagement';
import WorkerTasks from '../components/WorkerTasks';
import ReviewerVideoQueue from '../components/ReviewerVideoQueue';
import { getMe, logout, User } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface DashboardStats {
  total_videos: number;
  pending_reviews: number;
  completed_tasks: number;
  active_workers: number;
}

interface UserStats {
  videos_uploaded: number;
  videos_reviewed: number;
  tasks_completed: number;
  earnings: number;
}

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

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentView, setCurrentView] = useState<string>('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [preSelectedTask, setPreSelectedTask] = useState<{id: string, title: string} | null>(null);

  useEffect(() => {
    (async () => {
      const user = await getMe();
      if (!user) {
        router.replace('/login');
        return;
      }
      setMe(user);
      setAuthChecked(true);
      
      // Load dashboard data
      await loadDashboardData(user);
    })();
  }, [router]);

  const loadDashboardData = async (user: User) => {
    try {
      setLoading(true);
      console.log('Loading dashboard data for user:', user.role, user.user_id);
      
      // Load appropriate stats based on user role
      if (user.role === 'ADMIN') {
        console.log('Fetching admin dashboard statistics...');
        try {
          const stats = await apiFetch<DashboardStats>('/dashboard/statistics');
          console.log('Dashboard stats received:', stats);
          setDashboardStats(stats);
        } catch (adminError) {
          console.error('Failed to load admin dashboard stats:', adminError);
          setDashboardStats({
            total_videos: 0,
            pending_reviews: 0,
            completed_tasks: 0,
            active_workers: 0
          });
        }
      }
      
      // Load user-specific stats for all roles
      console.log('Fetching user statistics...');
      try {
        const userStats = await apiFetch<UserStats>(`/users/${user.user_id}/statistics`);
        console.log('User stats received:', userStats);
        setUserStats(userStats);
      } catch (userError) {
        console.error('Failed to load user stats:', userError);
        setUserStats({
          videos_uploaded: 0,
          videos_reviewed: 0,
          tasks_completed: 0,
          earnings: 0
        });
      }

      // Load user's video sessions
      console.log('Fetching user video sessions...');
      try {
        let sessions: VideoSession[] = [];
        if (user.role === 'ADMIN') {
          // Admins can see all video sessions
          sessions = await apiFetch<VideoSession[]>('/sessions/');
        } else {
          // Other users see only their own sessions
          sessions = await apiFetch<VideoSession[]>(`/sessions/?creator_id=${user.user_id}`);
        }
        console.log('Video sessions received:', sessions);
        setVideoSessions(sessions);
      } catch (videoError) {
        console.error('Failed to load video sessions:', videoError);
        setVideoSessions([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set fallback data
      setDashboardStats({
        total_videos: 0,
        pending_reviews: 0,
        completed_tasks: 0,
        active_workers: 0
      });
      setUserStats({
        videos_uploaded: 0,
        videos_reviewed: 0,
        tasks_completed: 0,
        earnings: 0
      });
      setVideoSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToUpload = (taskId: string, taskTitle: string) => {
    setPreSelectedTask({ id: taskId, title: taskTitle });
    setCurrentView('upload');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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

  const getNavigation = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'overview', label: 'Dashboard', description: 'System overview and analytics' },
          { id: 'tasks', label: 'Task Management', description: 'Create and manage tasks' },
          { id: 'upload', label: 'Upload Videos', description: 'Upload and manage content' },
          { id: 'videos', label: 'All Videos', description: 'View all video sessions' },
          { id: 'users', label: 'User Management', description: 'Manage users and permissions' },
          { id: 'settings', label: 'Settings', description: 'System configuration' }
        ];
      case 'WORKER':
        return [
          { id: 'overview', label: 'Dashboard', description: 'Your work overview' },
          { id: 'upload', label: 'Upload Videos', description: 'Upload videos for tasks' },
          { id: 'videos', label: 'My Videos', description: 'View your uploaded videos' },
          { id: 'tasks', label: 'Available Tasks', description: 'Browse and claim tasks' },
          { id: 'progress', label: 'My Progress', description: 'Track your completed work' }
        ];
      case 'REVIEWER':
        return [
          { id: 'overview', label: 'Dashboard', description: 'Review queue overview' },
          { id: 'upload', label: 'Upload Videos', description: 'Upload videos for review' },
          { id: 'videos', label: 'My Videos', description: 'View your uploaded videos' },
          { id: 'review', label: 'Review Queue', description: 'Review pending submissions' },
          { id: 'history', label: 'Review History', description: 'Your review history' }
        ];
      case 'CLIENT':
      default:
        return [
          { id: 'overview', label: 'Dashboard', description: 'Your project overview' },
          { id: 'upload', label: 'Upload Videos', description: 'Upload new content' },
          { id: 'gallery', label: 'My Videos', description: 'View your uploaded content' }
        ];
    }
  };

  const renderRoleBasedContent = () => {
    if (!me) return null;

    switch (me.role) {
      case 'ADMIN':
        return renderAdminContent();
      case 'WORKER':
        return renderWorkerContent();
      case 'REVIEWER':
        return renderReviewerContent();
      case 'CLIENT':
      default:
        return renderClientContent();
    }
  };

  const renderAdminContent = () => {
    if (currentView === 'tasks') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            {me && <TaskManagement currentUser={me} />}
          </div>
        </div>
      );
    }

    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Upload Videos</h2>
            <UploadDropzone requireTaskSelection={false} />
          </div>
        </div>
      );
    }

    if (currentView === 'videos') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">All Video Sessions</h2>
            {loading ? (
              <p className="text-[#666]">Loading video sessions...</p>
            ) : videoSessions.length === 0 ? (
              <p className="text-[#666]">No video sessions found in the system.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoSessions.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentView === 'users') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">User Management</h2>
            <p className="text-[#666]">User management features coming soon.</p>
          </div>
        </div>
      );
    }

    if (currentView === 'settings') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">System Settings</h2>
            <p className="text-[#666]">System configuration options coming soon.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Total Videos</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : videoSessions.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Pending Reviews</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : dashboardStats?.pending_reviews || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Completed Tasks</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : dashboardStats?.completed_tasks || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Active Workers</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : dashboardStats?.active_workers || 0}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderWorkerContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Upload Videos</h2>
            <p className="text-[#666] mb-4">
              {preSelectedTask 
                ? `Upload video for task: ${preSelectedTask.title}` 
                : 'Upload videos for your assigned tasks'
              }
            </p>
            <UploadDropzone 
              requireTaskSelection={true} 
              preSelectedTask={preSelectedTask?.id}
            />
          </div>
        </div>
      );
    }

    if (currentView === 'videos') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">My Videos</h2>
            {loading ? (
              <p className="text-[#666]">Loading videos...</p>
            ) : videoSessions.length === 0 ? (
              <p className="text-[#666]">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoSessions.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentView === 'tasks') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            {me && <WorkerTasks currentUser={me} onNavigateToUpload={handleNavigateToUpload} />}
          </div>
        </div>
      );
    }

    if (currentView === 'progress') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">My Progress</h2>
            <p className="text-[#666]">Your work history and progress tracking coming soon.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Tasks Completed</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : userStats?.tasks_completed || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Videos Uploaded</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : videoSessions.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Earnings</h3>
            <p className="text-2xl font-bold text-[#111111]">
              ${loading ? '...' : userStats?.earnings || 0}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderReviewerContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Upload Videos</h2>
            <p className="text-[#666] mb-4">Upload videos for review and evaluation</p>
            <UploadDropzone requireTaskSelection={false} />
          </div>
        </div>
      );
    }

    if (currentView === 'videos') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">My Videos</h2>
            {loading ? (
              <p className="text-[#666]">Loading videos...</p>
            ) : videoSessions.length === 0 ? (
              <p className="text-[#666]">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoSessions.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (currentView === 'review') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            {me && <ReviewerVideoQueue currentUser={me} />}
          </div>
        </div>
      );
    }

    if (currentView === 'history') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Review History</h2>
            <p className="text-[#666]">Your review history will appear here.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Videos Uploaded</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : videoSessions.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Videos Reviewed</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : userStats?.videos_reviewed || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Earnings</h3>
            <p className="text-2xl font-bold text-[#111111]">
              ${loading ? '...' : userStats?.earnings || 0}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderClientContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Upload Videos</h2>
            <UploadDropzone />
          </div>
        </div>
      );
    }

    if (currentView === 'gallery') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">My Videos</h2>
            {loading ? (
              <p className="text-[#666]">Loading videos...</p>
            ) : videoSessions.length === 0 ? (
              <p className="text-[#666]">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videoSessions.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Videos Uploaded</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : videoSessions.length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Tasks Completed</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : userStats?.tasks_completed || 0}
            </p>
          </div>
        </div>
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

  const navigation = getNavigation(me.role);

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-[#DCCFC0] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#DCCFC0]">
          <h1 className="text-xl font-bold text-[#111111]">Efference</h1>
          <p className="text-sm text-[#666] mt-1">
            {me.role} Dashboard
          </p>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                    currentView === item.id
                      ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                      : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                  }`}
                >
                  <div className="font-medium text-[#111111]">{item.label}</div>
                  <div className="text-xs text-[#666] mt-1">{item.description}</div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-[#DCCFC0]">
          <div className="mb-4">
            <div className="text-sm font-medium text-[#111111]">{me.name}</div>
            <div className="text-xs text-[#666]">{me.email}</div>
            <div className="text-xs text-[#A2AF9B] font-medium">{me.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-[#111111] text-white px-4 py-2 rounded-lg hover:bg-[#333] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-[#DCCFC0] px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#111111]">
                {navigation.find(nav => nav.id === currentView)?.label || 'Dashboard'}
              </h1>
              <p className="text-[#666] mt-1">
                {navigation.find(nav => nav.id === currentView)?.description}
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8">
          {renderRoleBasedContent()}
        </main>
      </div>
    </div>
  );
}