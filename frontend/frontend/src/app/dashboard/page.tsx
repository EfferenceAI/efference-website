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
      await loadDashboardData(user);
    })();
  }, [router]);

  const loadDashboardData = async (user: User) => {
    try {
      setLoading(true);

      if (user.role === 'ADMIN') {
        try {
          const stats = await apiFetch<DashboardStats>('/dashboard/statistics');
          setDashboardStats(stats);
        } catch {
          setDashboardStats({
            total_videos: 0,
            pending_reviews: 0,
            completed_tasks: 0,
            active_workers: 0
          });
        }
      }

      try {
        const u = await apiFetch<UserStats>(`/users/${user.user_id}/statistics`);
        setUserStats(u);
      } catch {
        setUserStats({
          videos_uploaded: 0,
          videos_reviewed: 0,
          tasks_completed: 0,
          earnings: 0
        });
      }

      try {
        let sessions: VideoSession[] = [];
        if (user.role === 'ADMIN') {
          sessions = await apiFetch<VideoSession[]>('/sessions/');
        } else {
          sessions = await apiFetch<VideoSession[]>(`/sessions/?creator_id=${user.user_id}`);
        }
        setVideoSessions(sessions);
      } catch {
        setVideoSessions([]);
      }
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

    // Brutalist status chip: square edges, bordered, uppercase
    const statusClasses = "px-2 py-1 text-xs font-bold uppercase border-2";

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'PENDING':
        case 'PENDING_REVIEW':
          return "border-black bg-black text-white";
        case 'PROCESSING':
          return "border-black bg-black text-white";
        case 'READY_FOR_REVIEW':
          return "border-black bg-white text-black";
        case 'COMPLETED':
          return "border-black bg-white text-black";
        case 'APPROVED':
          return "border-black bg-white text-black";
        case 'REJECTED':
          return "border-black bg-white text-black";
        default:
          return "border-black bg-white text-black";
      }
    };

    return (
      <div className="bg-white border-2 border-gray-400 p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-black uppercase tracking-tight text-black">
              {session.task?.title || `Task ${session.task_id.slice(0, 8)}`}
            </h3>
            <p className="text-xs text-black/80 mt-1">
              {session.task?.description || 'No description available'}
            </p>
          </div>
          <span className={`${statusClasses} ${getStatusStyle(session.status)}`}>
            {session.status.replaceAll('_', ' ')}
          </span>
        </div>

        <div className="text-xs text-black/80 space-y-1">
          <div>Created: {formatDate(session.created_at)}</div>
          <div>Updated: {formatDate(session.updated_at)}</div>
          {session.reviewer && (
            <div>Reviewer: {session.reviewer.name}</div>
          )}
        </div>

        {session.processed_1080p_s3_key && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-black">
              <span className="inline-block w-2 h-2 bg-black" />
              <span className="font-semibold">Video processed and ready</span>
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

  const Panel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '' }) => (
    <div className={`bg-black border-2 border-white p-6 ${className}`}>{children}</div>
  );

  const StatBox = ({ title, value }: { title: string; value: React.ReactNode }) => (
    <div className="bg-white border-2 border-gray-400 p-6">
      <h3 className="text-xs font-bold uppercase tracking-wide mb-2 text-black">{title}</h3>
      <p className="text-3xl font-black text-black">{value}</p>
    </div>
  );

  const renderAdminContent = () => {
    if (currentView === 'tasks') {
      return (
        <div className="space-y-6">
          <Panel>{me && <TaskManagement currentUser={me} />}</Panel>
        </div>
      );
    }

    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">Upload Videos</h2>
            <UploadDropzone requireTaskSelection={false} />
          </Panel>
        </div>
      );
    }

    if (currentView === 'videos') {
      const reviewableVideos = videoSessions.filter(session =>
        ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(session.status)
      );

      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">All Video Sessions</h2>
            {loading ? (
              <p className="text-black/70">Loading video sessions...</p>
            ) : reviewableVideos.length === 0 ? (
              <p className="text-black/70">No video sessions found in the system.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewableVideos.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      );
    }

    if (currentView === 'users') {
      return (
        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-400 p-6">
            <h2 className="text-lg font-black uppercase mb-4 text-black">User Management</h2>
            <p className="text-black/70">User management features coming soon.</p>
          </div>
        </div>
      );
    }

    if (currentView === 'settings') {
      return (
        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-400 p-6">
            <h2 className="text-lg font-black uppercase mb-4 text-black">System Settings</h2>
            <p className="text-black/70">System configuration options coming soon.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatBox
            title="Total Videos"
            value={loading ? '...' : videoSessions.filter(s =>
              ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(s.status)
            ).length}
          />
          <StatBox title="Pending Reviews" value={loading ? '...' : (dashboardStats?.pending_reviews || 0)} />
          <StatBox title="Completed Tasks" value={loading ? '...' : (dashboardStats?.completed_tasks || 0)} />
          <StatBox title="Active Workers" value={loading ? '...' : (dashboardStats?.active_workers || 0)} />
        </div>
      </div>
    );
  };

  const renderWorkerContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">Upload Videos</h2>
            <p className="mb-4">
              {preSelectedTask
                ? `Upload video for task: ${preSelectedTask.title}`
                : 'Upload videos for your assigned tasks'}
            </p>
            <UploadDropzone
              requireTaskSelection={true}
              preSelectedTask={preSelectedTask?.id}
            />
          </Panel>
        </div>
      );
    }

    if (currentView === 'videos') {
      const reviewableVideos = videoSessions.filter(session =>
        ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(session.status)
      );

      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">My Videos</h2>
            {loading ? (
              <p className="text-black/70">Loading videos...</p>
            ) : reviewableVideos.length === 0 ? (
              <p className="text-white/70">
                You haven&apos;t uploaded any videos yet. Start by uploading your first video!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewableVideos.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      );
    }

    if (currentView === 'tasks') {
      return (
        <div className="space-y-6">
          <Panel>{me && <WorkerTasks currentUser={me} onNavigateToUpload={handleNavigateToUpload} />}</Panel>
        </div>
      );
    }

    if (currentView === 'progress') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">My Progress</h2>
            <p className="text-white/70">Your work history and progress tracking coming soon.</p>
          </Panel>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox title="Tasks Completed" value={loading ? '...' : (userStats?.tasks_completed || 0)} />
          <StatBox
            title="Videos Uploaded"
            value={loading ? '...' : videoSessions.filter(s =>
              ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(s.status)
            ).length}
          />
          <StatBox title="Earnings" value={`$${loading ? '...' : (userStats?.earnings || 0)}`} />
        </div>
      </div>
    );
  };

  const renderReviewerContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">Upload Videos</h2>
            <p className="mb-4">Upload videos for review and evaluation</p>
            <UploadDropzone requireTaskSelection={false} />
          </Panel>
        </div>
      );
    }

    if (currentView === 'videos') {
      const reviewableVideos = videoSessions.filter(session =>
        ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(session.status)
      );

      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">My Videos</h2>
            {loading ? (
              <p className="text-black/70">Loading videos...</p>
            ) : reviewableVideos.length === 0 ? (
              <p className="text-white/70">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewableVideos.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      );
    }

    if (currentView === 'review') {
      return (
        <div className="space-y-6">
          <Panel>{me && <ReviewerVideoQueue currentUser={me} />}</Panel>
        </div>
      );
    }

    if (currentView === 'history') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">Review History</h2>
            <p className="text-white/70">Your review history will appear here.</p>
          </Panel>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatBox
            title="Videos Uploaded"
            value={loading ? '...' : videoSessions.filter(s =>
              ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(s.status)
            ).length}
          />
          <StatBox title="Videos Reviewed" value={loading ? '...' : (userStats?.videos_reviewed || 0)} />
          <StatBox title="Earnings" value={`$${loading ? '...' : (userStats?.earnings || 0)}`} />
        </div>
      </div>
    );
  };

  const renderClientContent = () => {
    if (currentView === 'upload') {
      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">Upload Videos</h2>
            <UploadDropzone />
          </Panel>
        </div>
      );
    }

    if (currentView === 'gallery') {
      const reviewableVideos = videoSessions.filter(session =>
        ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(session.status)
      );

      return (
        <div className="space-y-6">
          <Panel>
            <h2 className="text-lg font-black uppercase mb-4">My Videos</h2>
            {loading ? (
              <p className="text-black/70">Loading videos...</p>
            ) : reviewableVideos.length === 0 ? (
              <p className="text-white/70">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reviewableVideos.map((session) => (
                  <VideoSessionCard key={session.session_id} session={session} />
                ))}
              </div>
            )}
          </Panel>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatBox
            title="Videos Uploaded"
            value={loading ? '...' : videoSessions.filter(s =>
              ['PENDING_REVIEW','APPROVED','REJECTED','PROCESSING'].includes(s.status)
            ).length}
          />
          <StatBox title="Tasks Completed" value={loading ? '...' : (userStats?.tasks_completed || 0)} />
        </div>
      </div>
    );
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] flex items-center justify-center">
        <p className="font-mono text-black">Loading...</p>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  const navigation = getNavigation(me.role);

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Sidebar Navigation */}
      <div className="w-80 bg-black border-r-2 border-white flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 pl-10 border-b-2 border-white"> 
          <h1
              className="text-4xl font-black uppercase tracking-tight"
              style={{
                WebkitTextStrokeWidth: '1.2px',
                WebkitTextStrokeColor: '#fff',
                color: 'transparent',
                fontFamily:
                  "'Space Grotesk','Montserrat','Poppins',ui-sans-serif,system-ui",
                transform: 'scaleY(0.8) scaleX(1.15)',   // 👈 makes it shorter & wider
                transformOrigin: 'center',
                letterSpacing: '-0.02em'
              }}
          >
            EFFERENCE
          </h1>
          <p className="text-xs mt-2 uppercase">{me.role} Dashboard</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-6 py-4">
          <ul className="divide-y divide-white/50 border-t border-b border-white/50">
            {navigation.map((item) => {
              const active = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentView(item.id)}
                    className={`w-full text-left py-4 text-sm uppercase tracking-wide font-bold ${
                      active
                        ? 'text-white'
                        : 'text-white/70 hover:text-white'
                    } transition-colors`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] mt-1 normal-case opacity-60">
                      {item.description}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>


        {/* User Profile & Logout */}
        {/*<div className="p-4 border-t-2 border-black">
          <div className="mb-3">
            <div className="text-sm font-bold">{me.name}</div>
            <div className="text-xs">{me.email}</div>
            <div className="text-xs font-bold uppercase mt-1">{me.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full border-2 border-black bg-white text-black px-4 py-2 font-bold uppercase hover:bg-black hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>*/}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-black border-b-2 border-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black uppercase">
                {navigation.find(nav => nav.id === currentView)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs mt-1">
                {navigation.find(nav => nav.id === currentView)?.description}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="border-2 border-gray-400 text-black bg-white px-5 py-2 font-bold uppercase hover:bg-black hover:text-white transition-colors"
            >
              Logout
            </button>
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
