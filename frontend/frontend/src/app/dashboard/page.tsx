'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '../components/UploadDropzone';
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

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentView, setCurrentView] = useState<string>('overview');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
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
      
      // Load dashboard data
      await loadDashboardData(user);
    })();
  }, [router]);

  const loadDashboardData = async (user: User) => {
    try {
      setLoading(true);
      
      // Load appropriate stats based on user role
      if (user.role === 'ADMIN') {
        const stats = await apiFetch<DashboardStats>('/dashboard/statistics');
        setDashboardStats(stats);
      }
      
      // Load user-specific stats for all roles
      const userStats = await apiFetch<UserStats>(`/users/${user.user_id}/statistics`);
      setUserStats(userStats);
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const getNavigation = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'overview', label: 'Dashboard', description: 'System overview and analytics' },
          { id: 'upload', label: 'Upload Videos', description: 'Upload and manage content' },
          { id: 'users', label: 'User Management', description: 'Manage users and permissions' },
          { id: 'settings', label: 'Settings', description: 'System configuration' }
        ];
      case 'WORKER':
        return [
          { id: 'overview', label: 'Dashboard', description: 'Your work overview' },
          { id: 'tasks', label: 'Available Tasks', description: 'Browse and claim tasks' },
          { id: 'progress', label: 'My Progress', description: 'Track your completed work' }
        ];
      case 'REVIEWER':
        return [
          { id: 'overview', label: 'Dashboard', description: 'Review queue overview' },
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
              {loading ? '...' : dashboardStats?.total_videos || 0}
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
    if (currentView === 'tasks') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Available Tasks</h2>
            <p className="text-[#666]">No tasks available at the moment. Check back later.</p>
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

  const renderReviewerContent = () => {
    if (currentView === 'review') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h2 className="text-xl font-semibold text-[#111111] mb-4">Review Queue</h2>
            <p className="text-[#666]">No videos pending review at the moment.</p>
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
            <h3 className="text-sm font-medium text-[#666] mb-2">Videos Reviewed</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : userStats?.videos_reviewed || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <h3 className="text-sm font-medium text-[#666] mb-2">Pending Reviews</h3>
            <p className="text-2xl font-bold text-[#111111]">
              {loading ? '...' : dashboardStats?.pending_reviews || 0}
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
            <p className="text-[#666]">You haven&apos;t uploaded any videos yet. Start by uploading your first video!</p>
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
              {loading ? '...' : userStats?.videos_uploaded || 0}
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