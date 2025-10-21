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
  const [newUserEmail, setNewUserEmail] = useState('');
  const [addingUser, setAddingUser] = useState(false);
  const [addUserMessage, setAddUserMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingUserRole, setUpdatingUserRole] = useState<string | null>(null);

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

  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await apiFetch<User[]>('/users/');
      setAllUsers(users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUserRole(userId);
    try {
      await apiFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      });
      
      // Update the user in the local state
      setAllUsers(users => users.map(user => 
        user.user_id === userId ? { ...user, role: newRole as any } : user
      ));
    } catch (error) {
      console.error('Failed to update user role:', error);
      // Optionally show error message to user
    } finally {
      setUpdatingUserRole(null);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      setAddUserMessage('Please enter a valid email address');
      return;
    }

    setAddingUser(true);
    setAddUserMessage(null);

    try {
      // Create invitation
      const invitation = await apiFetch('/invitations/', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserEmail.trim(),
          role: 'WORKER' // Default role, can be made configurable later
        })
      });

      // Send invitation email
      await apiFetch(`/invitations/${invitation.invitation_code}/send`, {
        method: 'POST'
      });

      setAddUserMessage(`Invitation sent successfully to ${newUserEmail}`);
      setNewUserEmail('');
      
      // Refresh user list after adding
      await loadAllUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      if (error instanceof Error) {
        setAddUserMessage(`Error: ${error.message}`);
      } else {
        setAddUserMessage('Failed to send invitation. Please try again.');
      }
    } finally {
      setAddingUser(false);
    }
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
      // Load users when switching to users view
      if (allUsers.length === 0 && !loadingUsers) {
        loadAllUsers();
      }

      return (
        <div className="space-y-6">
          <div className="bg-white border-2 border-gray-400 p-6">
            <h2 className="text-lg font-black uppercase mb-4 text-black">User Management</h2>
            
            {/* Add User Form */}
            <div className="mb-6">
              <h3 className="text-md font-bold uppercase mb-3 text-black">Add New User</h3>
              <div className="flex gap-3 mb-3">
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Enter user email"
                  disabled={addingUser}
                  className="flex-1 px-3 py-2 border-2 border-black bg-white text-black focus:bg-black focus:text-white outline-none transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="px-6 py-2 border-2 border-black bg-black text-white font-bold uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                >
                  {addingUser ? 'Sending...' : 'Add User'}
                </button>
              </div>
              {addUserMessage && (
                <p className={`text-sm ${addUserMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {addUserMessage}
                </p>
              )}
            </div>

            {/* Current Users List */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-bold uppercase text-black">Current Users</h3>
                <button
                  onClick={loadAllUsers}
                  disabled={loadingUsers}
                  className="px-4 py-1 border-2 border-black bg-white text-black font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors disabled:opacity-50"
                >
                  {loadingUsers ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {loadingUsers ? (
                <p className="text-black/70">Loading users...</p>
              ) : allUsers.length === 0 ? (
                <p className="text-black/70">No users found.</p>
              ) : (
                <div className="border-2 border-black">
                  {/* Table Header */}
                  <div className="bg-black text-white grid grid-cols-3 gap-4 p-3 font-bold uppercase text-xs">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Role</div>
                  </div>
                  
                  {/* Table Rows */}
                  {allUsers.map((user, index) => (
                    <div 
                      key={user.user_id} 
                      className={`grid grid-cols-3 gap-4 p-3 text-sm border-b border-black/20 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="text-black font-medium">{user.name}</div>
                      <div className="text-black/80">{user.email}</div>
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value)}
                          disabled={updatingUserRole === user.user_id}
                          className="w-full px-2 py-1 border-2 border-black bg-white text-black font-bold uppercase text-xs hover:bg-black hover:text-white focus:bg-black focus:text-white outline-none appearance-none transition-colors disabled:opacity-50"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="WORKER">WORKER</option>
                          <option value="REVIEWER">REVIEWER</option>
                          <option value="CLIENT">CLIENT</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-black">
                          {updatingUserRole === user.user_id ? '...' : '▼'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
