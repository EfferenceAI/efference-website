'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '../components/UploadDropzone';
import { getMe, logout, User } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('overview');
  const [currentRole, setCurrentRole] = useState<string>('client');
  const [selectedVideo, setSelectedVideo] = useState<{
    id: string;
    title: string;
    category: string;
    duration: string;
    uploadDate: string;
    quality: string;
    fileSize: string;
    status: string;
  } | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [selectedTaskForApply, setSelectedTaskForApply] = useState<string>('');
  const [applyReason, setApplyReason] = useState<string>('');
  const [taskForm, setTaskForm] = useState({
    name: '',
    hourlyRate: '',
    details: '',
    category: 'cleaning'
  });
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [videoSummary, setVideoSummary] = useState<string>('');

  useEffect(() => {
    (async () => {
      const user = await getMe();
      if (!user) {
        router.replace('/login');
        return;
      }
      setMe(user);
      setCurrentRole(user.role.toLowerCase());
      setAuthChecked(true);
    })();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleOverview = () => {
    setSelectedCategory(null);
    setCurrentView('overview');
  };

  const handleSettings = () => {
    setCurrentView('settings');
    setSelectedCategory(null);
  };

  const handleVideoClick = (video: {
    id: string;
    title: string;
    category: string;
    duration: string;
    uploadDate: string;
    quality: string;
    fileSize: string;
    status: string;
  }) => {
    setSelectedVideo(video);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVideo(null);
  };

  const handleTaskSubmit = () => {
    // Handle task creation logic here
    console.log('Creating task:', taskForm);
    setShowTaskModal(false);
    setTaskForm({
      name: '',
      hourlyRate: '',
      details: '',
      category: 'cleaning'
    });
  };

  const handleTaskFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVideoSummarySubmit = () => {
    console.log('Video summary:', videoSummary);
    setShowSummaryModal(false);
    setVideoSummary('');
  };

  const handleVideoSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVideoSummary(e.target.value);
  };

  const handleApplyForTask = (taskName: string) => {
    setSelectedTaskForApply(taskName);
    setShowApplyModal(true);
  };

  const handleSubmitApplication = () => {
    if (applyReason.trim()) {
      console.log('Applied for task:', selectedTaskForApply, 'Reason:', applyReason);
      setShowApplyModal(false);
      setApplyReason('');
      setSelectedTaskForApply('');
      // You can add API call here to submit the application
    }
  };

  const handleCloseApplyModal = () => {
    setShowApplyModal(false);
    setApplyReason('');
    setSelectedTaskForApply('');
  };

  type VideoCategory = { id: string; title: string; description: string }
  const videoCategories: VideoCategory[] = [];

  const roles = [
    { id: 'client', label: 'Client', description: 'View and manage your content' },
    { id: 'worker', label: 'Worker', description: 'Process and categorize content' },
    { id: 'admin', label: 'Admin', description: 'Full system administration' }
  ];

  const handleRoleChange = (roleId: string) => {
    setCurrentRole(roleId);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center">
        <p className="text-[#666]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-[#DCCFC0] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#DCCFC0]">
          <h1 className="text-xl font-bold text-[#111111]">Efference</h1>
          <p className="text-sm text-[#666] mt-1">
            {currentRole === 'admin' ? 'Admin Panel' : 
             currentRole === 'worker' ? 'Worker Tools' : 
             'Client Portal'}
          </p>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {/* Admin Dashboard Menu Items */}
            {currentRole === 'admin' && (
              <>
                <li>
                  <button
                    onClick={() => {
                      setCurrentView('overview');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'overview'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Dashboard</div>
                        <div className="text-xs text-[#666] mt-1">System overview and stats</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'upload'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Video Upload</div>
                        <div className="text-xs text-[#666] mt-1">Upload and manage videos</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('manage-workers');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'manage-workers'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Manage Workers</div>
                        <div className="text-xs text-[#666] mt-1">Worker assignments and performance</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('payments');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'payments'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Process Payments</div>
                        <div className="text-xs text-[#666] mt-1">Handle billing and payments</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('tasks-management');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'tasks-management'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Tasks Management</div>
                        <div className="text-xs text-[#666] mt-1">Create and assign tasks</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('video-reviews');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'video-reviews'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Review Videos</div>
                        <div className="text-xs text-[#666] mt-1">Review and approve content</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'settings'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Settings</div>
                        <div className="text-xs text-[#666] mt-1">System configuration</div>
                      </div>
                    </div>
                  </button>
                </li>
              </>
            )}

            {/* Worker Dashboard Menu Items */}
            {currentRole === 'worker' && (
              <>
                <li>
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'upload'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Video Uploads</div>
                        <div className="text-xs text-[#666] mt-1">Process and categorize videos</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('revenue');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'revenue'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Revenue</div>
                        <div className="text-xs text-[#666] mt-1">Track your earnings</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('tasks');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'tasks'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Tasks</div>
                        <div className="text-xs text-[#666] mt-1">View assigned tasks and apply for new ones</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('settings');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'settings'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Settings</div>
                        <div className="text-xs text-[#666] mt-1">Manage your worker profile</div>
                      </div>
                    </div>
                  </button>
                </li>
              </>
            )}

            {/* Client Dashboard Menu Items */}
            {currentRole === 'client' && (
              <>
                <li>
                  <button
                    onClick={() => {
                      setCurrentView('overview');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'overview'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Dashboard</div>
                        <div className="text-xs text-[#666] mt-1">Your content overview</div>
                      </div>
                    </div>
                  </button>
                </li>

                <li>
                  <button
                    onClick={() => {
                      setCurrentView('upload');
                      setSelectedCategory(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                      currentView === 'upload'
                        ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                        : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium text-[#111111]">Upload Videos</div>
                        <div className="text-xs text-[#666] mt-1">Add new videos to the library</div>
                      </div>
                    </div>
                  </button>
                </li>
              </>
            )}

          </ul>
        </nav>
        
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#DCCFC0]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#111111]">
                  {currentView === 'overview' && `${roles.find(r => r.id === currentRole)?.label || 'Dashboard Overview'}`}
                  {currentView === 'settings' && 'Settings'}
                  {currentView === 'upload' && 'Upload Videos'}
                  {currentView === 'manage-workers' && 'Manage Workers'}
                  {currentView === 'payments' && 'Process Payments'}
                  {currentView === 'tasks-management' && 'Tasks Management'}
                  {currentView === 'video-reviews' && 'Review Videos'}
                  {currentView === 'revenue' && 'Revenue'}
                  {currentView === 'tasks' && 'Tasks'}
                  {currentView === 'category' && selectedCategory && 
                    videoCategories.find(cat => cat.id === selectedCategory)?.title
                  }
                </h2>
                <p className="text-sm text-[#666] mt-1">
                  {currentView === 'overview' && (roles.find(r => r.id === currentRole)?.description || 'Upload and manage your video content')}
                  {currentView === 'settings' && 'Manage your account and application settings'}
                  {currentView === 'upload' && 'Add new videos to the library for categorization'}
                  {currentView === 'manage-workers' && 'Worker assignments and performance management'}
                  {currentView === 'payments' && 'Handle billing and payment processing'}
                  {currentView === 'tasks-management' && 'Create and assign tasks to workers'}
                  {currentView === 'video-reviews' && 'Review and approve uploaded video content'}
                  {currentView === 'revenue' && 'Track your earnings and payment history'}
                  {currentView === 'tasks' && 'View and manage your assigned work tasks'}
                  {currentView === 'category' && selectedCategory && 
                    videoCategories.find(cat => cat.id === selectedCategory)?.description
                  }
                </p>
              </div>

              <nav className="flex items-center space-x-4">
                {/* Role Selector */}
                <div className="relative">
                  <select 
                    value={currentRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="appearance-none bg-[#A2AF9B] text-white px-4 py-2 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#A2AF9B]/50 hover:bg-[#8fa085] transition-colors cursor-pointer"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id} className="bg-white text-[#111111]">
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                >
                  Logout
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {currentView === 'overview' && (
            <div className="space-y-6">
              {/* Admin Dashboard Content */}
              {currentRole === 'admin' && (
                <>
                  {/* System Alerts */}
                  <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                    <h3 className="text-lg font-semibold text-[#111111] mb-4">System Alerts</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-blue-900">New worker application submitted</span>
                        </div>
                        <span className="text-xs text-blue-600">2 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-900">Payment processed successfully</span>
                        </div>
                        <span className="text-xs text-green-600">4 hours ago</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-medium text-orange-900">23 new videos needing verification review</span>
                        </div>
                        <span className="text-xs text-orange-600">6 hours ago</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#666]">Total Tasks</p>
                          <p className="text-2xl font-bold text-[#111111] mt-1">347</p>
                        </div>
                        <div className="w-12 h-12 bg-[#A2AF9B]/10 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-[#A2AF9B] rounded"></div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-green-600 font-medium">+12.5%</span>
                        <span className="text-xs text-[#666] ml-1">from last week</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#666]">Videos Collected</p>
                          <p className="text-2xl font-bold text-[#111111] mt-1">1,284</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-blue-500 rounded"></div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-green-600 font-medium">+8.2%</span>
                        <span className="text-xs text-[#666] ml-1">from last month</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#666]">Hours of Footage</p>
                          <p className="text-2xl font-bold text-[#111111] mt-1">2,847</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-purple-500 rounded"></div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-xs text-green-600 font-medium">+15.3%</span>
                        <span className="text-xs text-[#666] ml-1">from last month</span>
                      </div>
                    </div>

                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                    <h3 className="text-lg font-semibold text-[#111111] mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => setCurrentView('manage-workers')}
                        className="p-4 text-left border border-[#DCCFC0] rounded-lg hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors"
                      >
                        <div className="font-medium text-[#111111]">Review Worker Applications</div>
                        <div className="text-sm text-[#666] mt-1">1 pending application</div>
                      </button>
                      <button 
                        onClick={() => setCurrentView('payments')}
                        className="p-4 text-left border border-[#DCCFC0] rounded-lg hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors"
                      >
                        <div className="font-medium text-[#111111]">Process Payments</div>
                        <div className="text-sm text-[#666] mt-1">Manage worker payments</div>
                      </button>
                      <button 
                        onClick={() => setCurrentView('video-reviews')}
                        className="p-4 text-left border border-[#DCCFC0] rounded-lg hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors"
                      >
                        <div className="font-medium text-[#111111]">Review Pending Videos</div>
                        <div className="text-sm text-[#666] mt-1">23 videos need verification</div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Worker Dashboard Content */}
              {currentRole === 'worker' && (
                <div className="bg-white rounded-lg border border-[#DCCFC0] p-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-[#111111] mb-4">Welcome to Your Workspace</h3>
                    <p className="text-[#666] mb-6">
                      Process videos and manage your assigned tasks.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                      <div className="bg-[#FAF9EE] p-6 rounded-lg border border-[#DCCFC0]">
                        <div className="flex items-center justify-center">
                          <div className="text-2xl font-bold text-[#A2AF9B]">12</div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-[#666]">Pending Tasks</p>
                            <p className="text-xs text-[#999]">Ready for processing</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-[#FAF9EE] p-6 rounded-lg border border-[#DCCFC0]">
                        <div className="flex items-center justify-center">
                          <div className="text-2xl font-bold text-[#A2AF9B]">$247.50</div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-[#666]">This Week&#39;s Earnings</p>
                            <p className="text-xs text-[#999]">From completed tasks</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Dashboard Content */}
              {currentRole === 'client' && (
                <div className="bg-white rounded-lg border border-[#DCCFC0] p-8">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-[#111111] mb-4">Welcome to Efference</h3>
                    <p className="text-[#666] mb-6">
                      Upload and manage your video content using the upload section in the sidebar.
                    </p>
                    
                    <div className="grid grid-cols-1 gap-6 mt-8">
                      <div className="bg-[#FAF9EE] p-6 rounded-lg border border-[#DCCFC0]">
                        <div className="flex items-center justify-center">
                          <div className="text-2xl font-bold text-[#A2AF9B]">0:00:00</div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-[#666]">Total Duration</p>
                            <p className="text-xs text-[#999]">Hours of video content</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}


          {currentView === 'upload' && (
            <div className="space-y-6">
              {/* Upload Instructions */}
              <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#111111] mb-2">Video Upload Center</h3>
                    <p className="text-[#666] mb-4">
                      Upload high-quality videos for robotic ability training. Supported formats: MP4, WebM, MOV. 
                      Files will be processed and automatically categorized based on content analysis.
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-[#666]">
                      <span>🎥 Max file size: 5GB</span>
                      <span>⏱️ Max duration: 30 minutes</span>
                      <span>📊 Quality: 720p minimum</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Upload Component */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Upload Files</h4>
                  <p className="text-sm text-[#666] mt-1">Drag and drop videos or click to select files</p>
                  {uploadStatus && (
                    <p className="text-sm text-[#A2AF9B] mt-2 font-medium">{uploadStatus}</p>
                  )}
                </div>
                
                <div className="p-6">
                  <UploadDropzone
                    onUploadComplete={(files) => {
                      console.log('Upload completed:', files);
                      setUploadStatus(`Successfully uploaded ${files.length} files!`);
                    }}
                    onStatusUpdate={setUploadStatus}
                  />
                </div>
              </div>

              {/* Upload Queue/History */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Recent Uploads</h4>
                  <p className="text-sm text-[#666] mt-1">Track your upload history and processing status</p>
                </div>
                
                <div className="p-6">
                  {/* Sample Upload Items */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#EEEEEE] rounded flex items-center justify-center">
                          📹
                        </div>
                        <div>
                          <h5 className="font-medium text-[#111111]">robotic_arm_demo.mp4</h5>
                          <p className="text-sm text-[#666]">2.3 GB • Uploaded 2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          ✅ Processed
                        </span>
                        <button className="text-[#A2AF9B] hover:text-[#8fa085] text-sm">View</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#EEEEEE] rounded flex items-center justify-center">
                          📹
                        </div>
                        <div>
                          <h5 className="font-medium text-[#111111]">assembly_tutorial.webm</h5>
                          <p className="text-sm text-[#666]">1.8 GB • Uploading...</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-32 bg-[#EEEEEE] rounded-full h-2">
                          <div className="bg-[#A2AF9B] h-2 rounded-full" style={{width: '68%'}}></div>
                        </div>
                        <span className="text-sm text-[#666]">68%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#EEEEEE] rounded flex items-center justify-center">
                          📹
                        </div>
                        <div>
                          <h5 className="font-medium text-[#111111]">medical_procedure.mov</h5>
                          <p className="text-sm text-[#666]">3.1 GB • Processing...</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                          🔄 Processing
                        </span>
                        <button className="text-[#666] text-sm cursor-not-allowed">Processing</button>
                      </div>
                    </div>
                  </div>

                  {/* Empty State (when no uploads) */}
                  <div className="text-center py-8 text-[#666] hidden">
                    <div className="text-4xl mb-2">📤</div>
                    <p>No uploads yet. Start by dropping files above.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {currentView === 'tasks' && (
            <div className="space-y-6">
              {/* Available Tasks */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Available Tasks</h4>
                  <p className="text-sm text-[#666] mt-1">Browse and apply for new tasks</p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Sample Available Tasks */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          🧹
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$15/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Cleaning Video Analysis</h5>
                      <p className="text-sm text-[#666] mb-3">Categorize and analyze cleaning procedure videos for quality assessment.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 2-3 hours</span>
                        <span>Due: 2 days</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Cleaning Video Analysis')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>

                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          🎸
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$18/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Musical Instrument Training</h5>
                      <p className="text-sm text-[#666] mb-3">Review and categorize guitar tutorial videos for skill level classification.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 4-5 hours</span>
                        <span>Due: 3 days</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Available Task')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>

                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          🏥
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$22/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Medical Procedure Review</h5>
                      <p className="text-sm text-[#666] mb-3">Analyze medical training videos for accuracy and compliance verification.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 3-4 hours</span>
                        <span>Due: 1 day</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Available Task')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>

                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          🧺
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$14/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Laundry Process Analysis</h5>
                      <p className="text-sm text-[#666] mb-3">Categorize laundry and folding technique videos for robotic training.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 2-3 hours</span>
                        <span>Due: 4 days</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Available Task')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>

                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          🍳
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$16/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Cooking Tutorial Review</h5>
                      <p className="text-sm text-[#666] mb-3">Review cooking demonstration videos for technique accuracy and safety.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 3-4 hours</span>
                        <span>Due: 5 days</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Available Task')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>

                    <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          🚗
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">$20/hr</span>
                      </div>
                      <h5 className="font-semibold text-[#111111] mb-2">Driving Instruction Analysis</h5>
                      <p className="text-sm text-[#666] mb-3">Analyze driving tutorial videos for autonomous vehicle training data.</p>
                      <div className="flex items-center justify-between text-sm text-[#666] mb-3">
                        <span>Est. 4-5 hours</span>
                        <span>Due: 6 days</span>
                      </div>
                      <button 
                        onClick={() => handleApplyForTask('Available Task')}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                      >
                        Apply for Task
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Assigned Tasks */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">My Current Tasks</h4>
                  <p className="text-sm text-[#666] mt-1">Tasks you are currently working on</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Assigned Task 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-blue-50/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            🧹
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">Cleaning Video Analysis</h5>
                            <p className="text-sm text-[#666]">Assigned 2 days ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#A2AF9B]">$15/hr</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-32 bg-[#EEEEEE] rounded-full h-2">
                            <div className="bg-[#A2AF9B] h-2 rounded-full" style={{width: '60%'}}></div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-[#666]">Due:</span> 
                          <span className="text-orange-600 font-medium ml-1">Tomorrow</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-[#A2AF9B] font-medium">Estimated earnings: $37.50</span>
                      </div>
                    </div>

                    {/* Assigned Task 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-green-50/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            🍳
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">Cooking Tutorial Review</h5>
                            <p className="text-sm text-[#666]">Assigned 1 day ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#A2AF9B]">$16/hr</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-32 bg-[#EEEEEE] rounded-full h-2">
                            <div className="bg-[#A2AF9B] h-2 rounded-full" style={{width: '33%'}}></div>
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-[#666]">Due:</span> 
                          <span className="text-green-600 font-medium ml-1">3 days</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <span className="text-sm text-[#A2AF9B] font-medium">Estimated earnings: $24.00</span>
                      </div>
                    </div>

                    {/* Completed Task */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-gray-50/30 opacity-75">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            🧺
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">Laundry Process Analysis</h5>
                            <p className="text-sm text-[#666]">Completed 3 days ago</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">$42.00</div>
                          <div className="text-sm text-[#666]">3.0 hrs total</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-32 bg-[#EEEEEE] rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Completed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'revenue' && (
            <div className="space-y-6">
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">This Week</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$247.50</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-green-600 font-medium">+18.2% from last week</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">This Month</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$1,142.75</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-blue-600 font-medium">12 tasks completed</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">Average Per Task</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$20.64</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-purple-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-purple-600 font-medium">Mixed rate tasks</span>
                  </div>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Recent Earnings</h4>
                  <p className="text-sm text-[#666] mt-1">Task-by-task earnings breakdown</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Earning Item 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            🧹
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Kitchen Cleaning Analysis</h5>
                            <p className="text-sm text-[#666] mb-2">Completed 2 hours ago</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Hours worked: 2.5 hrs</span>
                              <span>Rate: $15/hr</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">$37.50</div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid</span>
                        </div>
                      </div>
                    </div>

                    {/* Earning Item 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            🍳
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Cooking Tutorial Review</h5>
                            <p className="text-sm text-[#666] mb-2">Completed yesterday</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Hours worked: 1.5 hrs</span>
                              <span>Rate: $16/hr</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">$24.00</div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid</span>
                        </div>
                      </div>
                    </div>

                    {/* Earning Item 3 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            🩺
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Medical Procedure Analysis</h5>
                            <p className="text-sm text-[#666] mb-2">Completed 2 days ago</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Hours worked: 3.0 hrs</span>
                              <span>Rate: $22/hr</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">$66.00</div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid</span>
                        </div>
                      </div>
                    </div>

                    {/* Earning Item 4 - Pending */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-orange-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            🧺
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Laundry Process Review</h5>
                            <p className="text-sm text-[#666] mb-2">Completed 1 hour ago</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Hours worked: 1.8 hrs</span>
                              <span>Rate: $14/hr</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#A2AF9B]">$25.20</div>
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Earning Item 5 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            🏠
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Home Organization Video</h5>
                            <p className="text-sm text-[#666] mb-2">Completed 3 days ago</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Hours worked: 2.2 hrs</span>
                              <span>Rate: $17/hr</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">$37.40</div>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Payment History</h4>
                  <p className="text-sm text-[#666] mt-1">Track your payment transactions</p>
                </div>
                
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#EEEEEE]">
                          <th className="text-left py-3 font-medium text-[#666]">Date</th>
                          <th className="text-left py-3 font-medium text-[#666]">Tasks</th>
                          <th className="text-left py-3 font-medium text-[#666]">Hours</th>
                          <th className="text-left py-3 font-medium text-[#666]">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3 font-medium text-[#111111]">Sep 28, 2024</td>
                          <td className="py-3 text-[#666]">3 tasks</td>
                          <td className="py-3 text-[#666]">7.0 hrs</td>
                          <td className="py-3 font-medium text-green-600">$127.50</td>
                        </tr>
                        
                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3 font-medium text-[#111111]">Sep 21, 2024</td>
                          <td className="py-3 text-[#666]">2 tasks</td>
                          <td className="py-3 text-[#666]">4.5 hrs</td>
                          <td className="py-3 font-medium text-green-600">$73.50</td>
                        </tr>

                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3 font-medium text-[#111111]">Sep 14, 2024</td>
                          <td className="py-3 text-[#666]">1 task</td>
                          <td className="py-3 text-[#666]">2.8 hrs</td>
                          <td className="py-3 font-medium text-green-600">$42.00</td>
                        </tr>

                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3 font-medium text-[#111111]">Sep 7, 2024</td>
                          <td className="py-3 text-[#666]">4 tasks</td>
                          <td className="py-3 text-[#666]">8.2 hrs</td>
                          <td className="py-3 font-medium text-green-600">$147.60</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'manage-workers' && (
            <div className="space-y-6">
              {/* Account Requests */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">New Account Requests</h4>
                  <p className="text-sm text-[#666] mt-1">Review and approve new account requests</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Account Request 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">JS</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">John Smith</h5>
                            <p className="text-sm text-[#666]">john.smith@email.com</p>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-[#666]">
                              <span>Username: johnsmith94</span>
                              <span>Requested: 2 hours ago</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Approve
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Reject
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Account Request 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">MJ</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-[#111111]">Maria Johnson</h5>
                            <p className="text-sm text-[#666]">maria.j@email.com</p>
                            <div className="mt-2 flex items-center space-x-4 text-sm text-[#666]">
                              <span>Username: maria_johnson</span>
                              <span>Requested: 5 hours ago</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Approve
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Reject
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Current Workers */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Active Workers</h4>
                  <p className="text-sm text-[#666] mt-1">Manage current workforce and permissions</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Worker 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold">AK</span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">Alex Kim</h5>
                            <p className="text-sm text-[#666]">alex.kim@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mt-1">
                              <span>Joined: 2 months ago</span>
                              <span>Tasks completed: 47</span>
                              <span>Rating: 4.8/5</span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                          <button className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors">
                            Suspend
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Worker 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">ST</span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">Sarah Thompson</h5>
                            <p className="text-sm text-[#666]">sarah.t@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mt-1">
                              <span>Joined: 1 month ago</span>
                              <span>Tasks completed: 23</span>
                              <span>Rating: 4.9/5</span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                          <button className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors">
                            Suspend
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Worker 3 - Suspended */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-yellow-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 font-semibold">DL</span>
                          </div>
                          <div>
                            <h5 className="font-semibold text-[#111111]">David Lee</h5>
                            <p className="text-sm text-[#666]">david.lee@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mt-1">
                              <span>Joined: 3 months ago</span>
                              <span>Tasks completed: 31</span>
                              <span>Rating: 3.2/5</span>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Suspended</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Reactivate
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'payments' && (
            <div className="space-y-6">
              {/* Payment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">Pending Payments</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$1,247.50</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-orange-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-orange-600 font-medium">7 workers awaiting payment</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">This Month&#39;s Total</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$8,934.25</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-green-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-green-600 font-medium">+12.5% from last month</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#666]">Average Per Worker</p>
                      <p className="text-2xl font-bold text-[#111111] mt-1">$342.15</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-500 rounded"></div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-blue-600 font-medium">26 active workers</span>
                  </div>
                </div>
              </div>

              {/* Worker Payment Details */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-[#111111]">Worker Payment Details</h4>
                      <p className="text-sm text-[#666] mt-1">Manage worker payments and banking information</p>
                    </div>
                    <button className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors">
                      Process All Pending
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Worker Payment 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold">AK</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">Alex Kim</h5>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Payment Pending</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">alex.kim@email.com</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-[#666]">Hours This Week:</span>
                                <div className="font-medium text-[#111111]">24.5 hrs</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Amount Due:</span>
                                <div className="font-medium text-[#111111]">$367.50</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Bank:</span>
                                <div className="font-medium text-[#111111]">Chase ****2847</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Last Payment:</span>
                                <div className="font-medium text-[#111111]">Sep 20, 2024</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            Process Payment
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Worker Payment 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">ST</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">Sarah Thompson</h5>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Payment Pending</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">sarah.t@email.com</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-[#666]">Hours This Week:</span>
                                <div className="font-medium text-[#111111]">18.5 hrs</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Amount Due:</span>
                                <div className="font-medium text-[#111111]">$314.50</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Bank:</span>
                                <div className="font-medium text-[#111111]">Wells Fargo ****1592</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Last Payment:</span>
                                <div className="font-medium text-[#111111]">Sep 20, 2024</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            Process Payment
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Worker Payment 3 - Recent Payment */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-green-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">MJ</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">Maria Johnson</h5>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Paid Today</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">maria.j@email.com</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-[#666]">Hours Last Week:</span>
                                <div className="font-medium text-[#111111]">22.0 hrs</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Amount Paid:</span>
                                <div className="font-medium text-[#111111]">$484.00</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Bank:</span>
                                <div className="font-medium text-[#111111]">Bank of America ****7431</div>
                              </div>
                              <div>
                                <span className="text-[#666]">Payment Date:</span>
                                <div className="font-medium text-[#111111]">Today, 2:30 PM</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            View Receipt
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History/Logs */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-[#111111]">Payment Logs</h4>
                      <p className="text-sm text-[#666] mt-1">Complete history of all payment transactions</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select className="px-3 py-2 border border-[#DCCFC0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent bg-white">
                        <option>Last 30 days</option>
                        <option>Last 3 months</option>
                        <option>Last 6 months</option>
                        <option>This year</option>
                      </select>
                      <button className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors">
                        Export CSV
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#EEEEEE]">
                          <th className="text-left py-3 font-medium text-[#666]">Date & Time</th>
                          <th className="text-left py-3 font-medium text-[#666]">Worker</th>
                          <th className="text-left py-3 font-medium text-[#666]">Amount</th>
                          <th className="text-left py-3 font-medium text-[#666]">Hours</th>
                          <th className="text-left py-3 font-medium text-[#666]">Bank Account</th>
                          <th className="text-left py-3 font-medium text-[#666]">Status</th>
                          <th className="text-left py-3 font-medium text-[#666]">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-[#111111]">Sep 28, 2024</div>
                            <div className="text-[#666]">2:30 PM</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold text-xs">MJ</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#111111]">Maria Johnson</div>
                                <div className="text-[#666]">maria.j@email.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-[#111111]">$484.00</td>
                          <td className="py-3 text-[#666]">22.0 hrs</td>
                          <td className="py-3 text-[#666]">BOA ****7431</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
                          </td>
                          <td className="py-3 text-[#666] font-mono text-xs">TXN_20240928_001247</td>
                        </tr>
                        
                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-[#111111]">Sep 27, 2024</div>
                            <div className="text-[#666]">4:15 PM</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-xs">JC</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#111111]">John Chen</div>
                                <div className="text-[#666]">john.c@email.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-[#111111]">$287.50</td>
                          <td className="py-3 text-[#666]">19.5 hrs</td>
                          <td className="py-3 text-[#666]">Chase ****9182</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
                          </td>
                          <td className="py-3 text-[#666] font-mono text-xs">TXN_20240927_001156</td>
                        </tr>

                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-[#111111]">Sep 26, 2024</div>
                            <div className="text-[#666]">1:45 PM</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 font-semibold text-xs">AK</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#111111]">Alex Kim</div>
                                <div className="text-[#666]">alex.kim@email.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-[#111111]">$412.75</td>
                          <td className="py-3 text-[#666]">26.5 hrs</td>
                          <td className="py-3 text-[#666]">Chase ****2847</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
                          </td>
                          <td className="py-3 text-[#666] font-mono text-xs">TXN_20240926_001089</td>
                        </tr>

                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-[#111111]">Sep 25, 2024</div>
                            <div className="text-[#666]">11:20 AM</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <span className="text-yellow-600 font-semibold text-xs">LS</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#111111]">Lisa Santos</div>
                                <div className="text-[#666]">lisa.s@email.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-[#111111]">$198.00</td>
                          <td className="py-3 text-[#666]">12.0 hrs</td>
                          <td className="py-3 text-[#666]">Wells ****4736</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Failed</span>
                          </td>
                          <td className="py-3 text-[#666] font-mono text-xs">TXN_20240925_001024</td>
                        </tr>

                        <tr className="border-b border-[#EEEEEE] hover:bg-[#FAF9EE] transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-[#111111]">Sep 24, 2024</div>
                            <div className="text-[#666]">3:10 PM</div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 font-semibold text-xs">RT</span>
                              </div>
                              <div>
                                <div className="font-medium text-[#111111]">Robert Taylor</div>
                                <div className="text-[#666]">robert.t@email.com</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-medium text-[#111111]">$356.25</td>
                          <td className="py-3 text-[#666]">21.5 hrs</td>
                          <td className="py-3 text-[#666]">Citi ****5892</td>
                          <td className="py-3">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">Processing</span>
                          </td>
                          <td className="py-3 text-[#666] font-mono text-xs">TXN_20240924_000987</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'tasks-management' && (
            <div className="space-y-6">
              {/* Task Management */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-[#111111]">Tasks Management</h4>
                      <p className="text-sm text-[#666] mt-1">Create new tasks and assign them to workers</p>
                    </div>
                    <button 
                      onClick={() => setShowTaskModal(true)}
                      className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
                    >
                      Create New Task
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Existing Task 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-semibold text-[#111111]">Kitchen Cleaning Analysis</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">$15/hr</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>
                          </div>
                          <p className="text-sm text-[#666] mb-2">
                            Review and categorize kitchen cleaning procedure videos for AI training data.
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-[#666]">
                            <span>Created: 2 days ago</span>
                            <span>Assigned to: Alex Kim</span>
                            <span>Progress: 60% complete</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            Edit
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            Reassign
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Task 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-semibold text-[#111111]">Medical Procedure Review</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">$22/hr</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Pending Assignment</span>
                          </div>
                          <p className="text-sm text-[#666] mb-2">
                            Analyze medical training videos for accuracy and compliance verification.
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-[#666]">
                            <span>Created: 5 hours ago</span>
                            <span>Unassigned</span>
                            <span>3 applications received</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 transition-colors">
                            View Applications
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            Assign Worker
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Existing Task 3 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4 bg-green-50/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h5 className="font-semibold text-[#111111]">Cooking Tutorial Analysis</h5>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">$16/hr</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Completed</span>
                          </div>
                          <p className="text-sm text-[#666] mb-2">
                            Review cooking demonstration videos for technique accuracy and safety.
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-[#666]">
                            <span>Completed: Yesterday</span>
                            <span>Completed by: Sarah Thompson</span>
                            <span>Quality: 95% accuracy</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Results
                          </button>
                          <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Applications */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Task Applications</h4>
                  <p className="text-sm text-[#666] mt-1">Review and manage worker applications for existing tasks</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Application 1 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">JS</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">John Smith</h5>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Applied for: Medical Procedure Review</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">john.smith@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Applied: 3 hours ago</span>
                              <span>Experience: 3 years medical video analysis</span>
                              <span>Rate: $22/hr requested</span>
                            </div>
                            <p className="text-sm text-[#666]">
                              &quot;I have extensive experience in medical video analysis and compliance verification. Previously worked on surgical training content review.&quot;
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Accept
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Reject
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Application 2 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-semibold">MK</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">Mike Kelly</h5>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Applied for: Medical Procedure Review</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">mike.kelly@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Applied: 5 hours ago</span>
                              <span>Experience: 2 years healthcare QA</span>
                              <span>Rate: $20/hr requested</span>
                            </div>
                            <p className="text-sm text-[#666]">
                              &quot;Background in healthcare quality assurance and medical procedure documentation. Detail-oriented approach to compliance standards.&quot;
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Accept
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Reject
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Application 3 */}
                    <div className="border border-[#DCCFC0] rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-600 font-semibold">ER</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h5 className="font-semibold text-[#111111]">Emma Rodriguez</h5>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Applied for: Cleaning Video Analysis</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">emma.rodriguez@email.com</p>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Applied: 1 day ago</span>
                              <span>Experience: 1 year content analysis</span>
                              <span>Rate: $14/hr requested</span>
                            </div>
                            <p className="text-sm text-[#666]">
                              &quot;New to video analysis but eager to learn. Strong attention to detail and experience in data categorization tasks.&quot;
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                            Accept
                          </button>
                          <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Reject
                          </button>
                          <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'video-reviews' && (
            <div className="bg-white rounded-lg border border-[#DCCFC0]">
              <div className="p-6 border-b border-[#EEEEEE]">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[#111111]">Videos Pending Review</h4>
                    <p className="text-sm text-[#666] mt-1">Review and approve videos submitted by workers</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select className="px-3 py-2 border border-[#DCCFC0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent bg-white">
                      <option>All Status</option>
                      <option>Pending Review</option>
                      <option>Approved</option>
                      <option>Rejected</option>
                    </select>
                    <select className="px-3 py-2 border border-[#DCCFC0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent bg-white">
                      <option>All Categories</option>
                      <option>Cleaning</option>
                      <option>Cooking</option>
                      <option>Medical</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {/* Video Review Item 1 */}
                  <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-[#111111] mb-1">Kitchen Cleaning Procedure - Step by Step</h5>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Uploaded by: Alex Kim</span>
                              <span>Duration: 14:32</span>
                              <span>Size: 2.1 GB</span>
                              <span>Category: Cleaning</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">
                              Comprehensive guide on kitchen cleaning procedures including counter sanitization, equipment maintenance, and proper disposal methods.
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Uploaded: 2 hours ago</span>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Pending Review</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                              Preview
                            </button>
                            <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                              Approve
                            </button>
                            <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Review Item 2 */}
                  <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-[#111111] mb-1">Basic Cooking Techniques - Sautéing Vegetables</h5>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Uploaded by: Sarah Thompson</span>
                              <span>Duration: 8:45</span>
                              <span>Size: 1.2 GB</span>
                              <span>Category: Cooking</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">
                              Demonstration of proper sautéing techniques including temperature control, timing, and seasoning methods for optimal results.
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Uploaded: 4 hours ago</span>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Pending Review</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                              Preview
                            </button>
                            <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                              Approve
                            </button>
                            <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Review Item 3 */}
                  <div className="border border-[#DCCFC0] rounded-lg p-4 hover:border-[#A2AF9B] transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-[#111111] mb-1">Medical Equipment Sterilization Protocol</h5>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Uploaded by: Maria Johnson</span>
                              <span>Duration: 12:18</span>
                              <span>Size: 1.8 GB</span>
                              <span>Category: Medical</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">
                              Step-by-step medical equipment sterilization following hospital standards and safety protocols for infection control.
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Uploaded: 6 hours ago</span>
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Pending Review</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                              Preview
                            </button>
                            <button className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors">
                              Approve
                            </button>
                            <button className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Review Item 4 - Approved */}
                  <div className="border border-[#DCCFC0] rounded-lg p-4 bg-green-50/30">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-[#111111] mb-1">Laundry Folding Techniques - Efficient Methods</h5>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Uploaded by: John Chen</span>
                              <span>Duration: 6:23</span>
                              <span>Size: 892 MB</span>
                              <span>Category: Cleaning</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">
                              Professional laundry folding techniques for various garment types including time-saving methods and organization tips.
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Uploaded: 1 day ago</span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Approved</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                              View
                            </button>
                            <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                              Archive
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Review Item 5 - Rejected */}
                  <div className="border border-[#DCCFC0] rounded-lg p-4 bg-red-50/30">
                    <div className="flex items-start space-x-4">
                      <div className="w-24 h-16 bg-[#EEEEEE] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🎥</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-semibold text-[#111111] mb-1">Floor Mopping Tutorial - Home Basics</h5>
                            <div className="flex items-center space-x-4 text-sm text-[#666] mb-2">
                              <span>Uploaded by: Lisa Santos</span>
                              <span>Duration: 5:12</span>
                              <span>Size: 743 MB</span>
                              <span>Category: Cleaning</span>
                            </div>
                            <p className="text-sm text-[#666] mb-2">
                              Basic floor mopping techniques for different surface types. <span className="text-red-600 font-medium">Rejected: Poor video quality, unclear audio.</span>
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-[#666]">
                              <span>Uploaded: 2 days ago</span>
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Rejected</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-[#A2AF9B] text-white text-sm rounded-md hover:bg-[#8fa085] transition-colors">
                              Review Again
                            </button>
                            <button className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="bg-white rounded-lg border border-[#DCCFC0] p-8">
              <div className="max-w-2xl">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-[#111111] mb-2">Account Settings</h3>
                  <p className="text-[#666]">Manage your account security and preferences</p>
                </div>

                {/* Password Change Section */}
                <div className="mb-8 pb-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111] mb-4">Change Password</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Current Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter your current password"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">New Password</label>
                      <input 
                        type="password" 
                        placeholder="Enter your new password"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Confirm New Password</label>
                      <input 
                        type="password" 
                        placeholder="Confirm your new password"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Information Section */}
                <div className="mb-8 pb-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111] mb-4">Profile Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="Enter your full name"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Email</label>
                      <input 
                        type="email" 
                        placeholder="Enter your email address"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button className="bg-[#A2AF9B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#8fa085] transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Video Details Modal */}
      {showModal && selectedVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
              <h3 className="text-xl font-bold text-[#111111]">Video Details</h3>
              <button 
                onClick={closeModal}
                className="text-[#666] hover:text-[#111111] text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Video Preview */}
              <div className="aspect-video bg-[#EEEEEE] rounded-lg mb-6 flex items-center justify-center text-6xl">
                📹
              </div>

              {/* Video Information */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-[#111111] mb-2">{selectedVideo.title}</h4>
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${
                    selectedVideo.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedVideo.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedVideo.status === 'completed' ? 'Completed' :
                     selectedVideo.status === 'in_progress' ? '🔄 In Progress' :
                     '⏳ Pending'}
                  </span>
                </div>

                {/* Video Specs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                    <div className="text-sm text-[#666] mb-1">Duration</div>
                    <div className="font-semibold text-[#111111]">{selectedVideo.duration}</div>
                  </div>
                  <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                    <div className="text-sm text-[#666] mb-1">Quality</div>
                    <div className="font-semibold text-[#111111]">{selectedVideo.quality}</div>
                  </div>
                  <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                    <div className="text-sm text-[#666] mb-1">File Size</div>
                    <div className="font-semibold text-[#111111]">{selectedVideo.fileSize}</div>
                  </div>
                  <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                    <div className="text-sm text-[#666] mb-1">Upload Date</div>
                    <div className="font-semibold text-[#111111]">{selectedVideo.uploadDate}</div>
                  </div>
                </div>

                {/* Category */}
                <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                  <div className="text-sm text-[#666] mb-1">Category</div>
                  <div className="font-semibold text-[#111111]">{selectedVideo.category}</div>
                </div>

                {/* Video ID */}
                <div className="bg-[#FAF9EE] p-4 rounded-lg border border-[#DCCFC0]">
                  <div className="text-sm text-[#666] mb-1">Video ID</div>
                  <div className="font-mono text-sm text-[#111111]">{selectedVideo.id}</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-[#EEEEEE]">
              <button 
                onClick={closeModal}
                className="px-4 py-2 text-[#666] hover:text-[#111111] font-medium"
              >
                Close
              </button>
              <button 
                className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md font-medium hover:bg-[#8fa085] transition-colors"
                onClick={closeModal}
              >
                View Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
              <h3 className="text-xl font-bold text-[#111111]">Create New Task</h3>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="text-[#666] hover:text-[#111111] text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Task Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={taskForm.name}
                    onChange={handleTaskFormChange}
                    placeholder="Enter task name"
                    className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Hourly Rate ($)</label>
                  <input 
                    type="number" 
                    name="hourlyRate"
                    value={taskForm.hourlyRate}
                    onChange={handleTaskFormChange}
                    placeholder="15.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Category</label>
                  <select 
                    name="category"
                    value={taskForm.category}
                    onChange={handleTaskFormChange}
                    className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent bg-white"
                  >
                    <option value="">Select category</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="cooking">Cooking</option>
                    <option value="medical">Medical</option>
                    <option value="laundry">Laundry</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111111] mb-1">Task Details</label>
                  <textarea 
                    name="details"
                    value={taskForm.details}
                    onChange={handleTaskFormChange}
                    placeholder="Describe the task requirements, expectations, and any specific instructions..."
                    rows={4}
                    className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-[#EEEEEE]">
              <button 
                onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-[#666] hover:text-[#111111] font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleTaskSubmit}
                className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md font-medium hover:bg-[#8fa085] transition-colors"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply for Task Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EEEEEE]">
              <h3 className="text-lg font-semibold text-[#111111]">Apply for Task</h3>
              <p className="text-sm text-[#666] mt-1">
                Tell us why you want to work on &quot;{selectedTaskForApply}&quot;
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">
                  Why do you want this task? *
                </label>
                <textarea 
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="e.g., I have experience with video analysis and am familiar with the cleaning industry. I can complete this task efficiently and provide high-quality results..."
                  rows={4}
                  className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent resize-none"
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-[#EEEEEE]">
              <button 
                onClick={handleCloseApplyModal}
                className="px-4 py-2 text-[#666] hover:text-[#111111] font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitApplication}
                disabled={!applyReason.trim()}
                className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md font-medium hover:bg-[#8fa085] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#EEEEEE]">
              <h3 className="text-xl font-bold text-[#111111]">Video Summary</h3>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="text-[#666] hover:text-[#111111] text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-[#666] mb-4">
                  Please provide a brief summary of your egocentric video content. This helps our AI better understand and categorize your uploaded videos.
                </p>
                
                {/* Example */}
                <div className="bg-[#FAF9EE] border border-[#DCCFC0] rounded-lg p-4 mb-4">
                  <div className="text-sm">
                    <div className="font-medium text-[#111111] mb-2">Example:</div>
                    <div className="text-[#666] italic">
                      &quot;This is a bartending tutorial where I demonstrate how to make a classic mojito.
                      The video shows the complete process from muddling mint to garnishing. 
                      Note: At the 7th minute I took a bathroom break, so there&#39;s a brief pause in the demonstration.&quot;
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111111] mb-2">Video Summary</label>
                <textarea 
                  value={videoSummary}
                  onChange={handleVideoSummaryChange}
                  placeholder="Describe what happens in your video, including any breaks, interruptions, or notable moments with timestamps..."
                  rows={6}
                  className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-[#EEEEEE]">
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 text-[#666] hover:text-[#111111] font-medium"
              >
                Skip
              </button>
              <button 
                onClick={handleVideoSummarySubmit}
                className="bg-[#A2AF9B] text-white px-4 py-2 rounded-md font-medium hover:bg-[#8fa085] transition-colors"
              >
                Submit Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}