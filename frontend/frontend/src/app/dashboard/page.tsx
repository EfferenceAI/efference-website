'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import UploadDropzone from '../components/UploadDropzone';

export default function DashboardPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('overview');
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

  const handleLogout = () => {
    router.push('/login');
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

  const videoCategories = [
    {
      title: "Lego Videos",
      description: "Categorize and analyze LEGO assembly and construction videos",
      icon: "[LEGO]",
      id: "lego",
      videos: [
        { id: "lego_001", title: "Millennium Falcon Assembly - Part 1", duration: "14:32", status: "pending", quality: "1080p", fileSize: "2.1 GB", uploadDate: "2024-03-15", category: "Advanced Assembly" },
        { id: "lego_002", title: "Castle Building Techniques", duration: "08:45", status: "completed", quality: "4K", fileSize: "1.8 GB", uploadDate: "2024-03-12", category: "Building Techniques" },
        { id: "lego_003", title: "Technic Motor Integration", duration: "22:18", status: "pending", quality: "1080p", fileSize: "3.2 GB", uploadDate: "2024-03-10", category: "Technical Build" },
        { id: "lego_004", title: "Modular Building Connection", duration: "11:07", status: "in_progress", quality: "720p", fileSize: "1.5 GB", uploadDate: "2024-03-08", category: "Modular Design" },
        { id: "lego_005", title: "Custom Minifigure Creation", duration: "06:23", status: "completed", quality: "4K", fileSize: "1.2 GB", uploadDate: "2024-03-05", category: "Customization" },
        { id: "lego_006", title: "Advanced Sorting Techniques", duration: "19:56", status: "pending", quality: "1080p", fileSize: "2.8 GB", uploadDate: "2024-03-02", category: "Organization" }
      ]
    },
    {
      title: "Medical Videos", 
      description: "Process medical procedure and healthcare training videos",
      icon: "[MEDICAL]",
      id: "medical",
      videos: [
        { id: "med_001", title: "Surgical Hand Washing Protocol", duration: "05:42", status: "completed", quality: "4K", fileSize: "1.1 GB", uploadDate: "2024-03-14", category: "Hygiene Protocol" },
        { id: "med_002", title: "IV Insertion Technique", duration: "12:15", status: "pending", quality: "1080p", fileSize: "2.0 GB", uploadDate: "2024-03-11", category: "Procedures" },
        { id: "med_003", title: "Blood Pressure Measurement", duration: "07:33", status: "completed", quality: "1080p", fileSize: "1.3 GB", uploadDate: "2024-03-09", category: "Vital Signs" },
        { id: "med_004", title: "CPR Training Demonstration", duration: "18:27", status: "in_progress", quality: "720p", fileSize: "2.7 GB", uploadDate: "2024-03-07", category: "Emergency Care" },
        { id: "med_005", title: "Wound Dressing Application", duration: "09:14", status: "pending", quality: "4K", fileSize: "1.9 GB", uploadDate: "2024-03-04", category: "Wound Care" },
        { id: "med_006", title: "Patient Transfer Procedures", duration: "15:08", status: "completed", quality: "1080p", fileSize: "2.4 GB", uploadDate: "2024-03-01", category: "Patient Care" },
        { id: "med_007", title: "Medication Administration", duration: "11:45", status: "pending", quality: "4K", fileSize: "2.2 GB", uploadDate: "2024-02-28", category: "Medication" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-[#DCCFC0] flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-[#DCCFC0]">
          <h1 className="text-xl font-bold text-[#111111]">Efference</h1>
          <p className="text-sm text-[#666] mt-1">Video Categories</p>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {/* Upload Section */}
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
                  <span className="text-2xl">[UPLOAD]</span>
                  <div>
                    <div className="font-medium text-[#111111]">Upload Videos</div>
                    <div className="text-xs text-[#666] mt-1">Add new videos to the library</div>
                  </div>
                </div>
              </button>
            </li>

            {/* Divider */}
            <li className="py-2">
              <div className="border-t border-[#EEEEEE]"></div>
            </li>

            {/* Video Categories */}
            {videoCategories.map((category) => (
              <li key={category.id}>
                <button
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setCurrentView('category');
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all hover:bg-[#A2AF9B]/10 ${
                    selectedCategory === category.id && currentView === 'category'
                      ? 'bg-[#A2AF9B]/20 border-l-4 border-[#A2AF9B]' 
                      : 'hover:border-l-4 hover:border-[#A2AF9B]/30'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="font-medium text-[#111111]">{category.title}</div>
                      <div className="text-xs text-[#666] mt-1">{category.description}</div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#DCCFC0]">
          <button 
            onClick={handleLogout}
            className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#8fa085] transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#DCCFC0]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#111111]">
                  {currentView === 'overview' && 'Dashboard Overview'}
                  {currentView === 'settings' && 'Settings'}
                  {currentView === 'upload' && 'Upload Videos'}
                  {currentView === 'category' && selectedCategory && 
                    videoCategories.find(cat => cat.id === selectedCategory)?.title
                  }
                </h2>
                <p className="text-sm text-[#666] mt-1">
                  {currentView === 'overview' && 'Select a video category from the sidebar to begin'}
                  {currentView === 'settings' && 'Manage your account and application settings'}
                  {currentView === 'upload' && 'Add new videos to the library for categorization'}
                  {currentView === 'category' && selectedCategory && 
                    videoCategories.find(cat => cat.id === selectedCategory)?.description
                  }
                </p>
              </div>
              
              <nav className="flex items-center space-x-4">
                <button 
                  onClick={handleOverview}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'overview' 
                      ? 'text-[#A2AF9B] border-b-2 border-[#A2AF9B]' 
                      : 'text-[#666] hover:text-[#111111]'
                  }`}
                >
                  Overview
                </button>
                <button 
                  onClick={handleSettings}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    currentView === 'settings' 
                      ? 'text-[#A2AF9B] border-b-2 border-[#A2AF9B]' 
                      : 'text-[#666] hover:text-[#111111]'
                  }`}
                >
                  Settings
                </button>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {currentView === 'overview' && (
            <div className="bg-white rounded-lg border border-[#DCCFC0] p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#111111] mb-4">Welcome to Efference</h3>
                <p className="text-[#666] mb-6">
                  Select a video category from the sidebar to begin categorization and analysis.
                </p>
                
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-[#FAF9EE] p-6 rounded-lg border border-[#DCCFC0]">
                    <div className="flex items-center justify-center">
                      <div className="text-2xl font-bold text-[#A2AF9B]">101:51:32</div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-[#666]">Total Duration</p>
                        <p className="text-xs text-[#999]">Hours of video content</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[#FAF9EE] p-6 rounded-lg border border-[#DCCFC0]">
                    <div className="flex items-center justify-center">
                      <div className="text-2xl font-bold text-[#A2AF9B]">{videoCategories.length}</div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-[#666]">Categories</p>
                        <p className="text-xs text-[#999]">Available for processing</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'category' && selectedCategory && (
            <div className="space-y-6">
              {/* Category Header */}
              <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">
                    {videoCategories.find(cat => cat.id === selectedCategory)?.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[#111111] mb-1">
                      {videoCategories.find(cat => cat.id === selectedCategory)?.title}
                    </h3>
                    <p className="text-[#666]">
                      {videoCategories.find(cat => cat.id === selectedCategory)?.description}
                    </p>
                  </div>
                  <button className="bg-[#A2AF9B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#8fa085] transition-colors">
                    Start Batch Categorization
                  </button>
                </div>
              </div>

              {/* Video Grid */}
              <div className="bg-white rounded-lg border border-[#DCCFC0]">
                <div className="p-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111]">Video Library</h4>
                  <p className="text-sm text-[#666] mt-1">
                    {videoCategories.find(cat => cat.id === selectedCategory)?.videos.length} videos available for categorization
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {videoCategories.find(cat => cat.id === selectedCategory)?.videos.map((video) => (
                      <div key={video.id} className="group relative cursor-pointer" onClick={() => handleVideoClick(video)}>
                        {/* Video Thumbnail */}
                        <div className="aspect-square bg-[#EEEEEE] rounded-lg overflow-hidden relative border border-[#DCCFC0] hover:border-[#A2AF9B] transition-colors">
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            [VIDEO]
                          </div>
                          
                          {/* Duration Badge */}
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {video.duration}
                          </div>
                          
                          {/* Status Badge */}
                          <div className="absolute top-2 left-2">
                            <div className={`w-3 h-3 rounded-full ${
                              video.status === 'completed' ? 'bg-green-500' :
                              video.status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`}></div>
                          </div>
                          
                        </div>
                        
                        {/* Video Info */}
                        <div className="mt-2">
                          <h5 className="font-medium text-[#111111] text-sm leading-tight line-clamp-2">
                            {video.title}
                          </h5>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-[#666]">
                              {video.status === 'completed' ? 'Done' :
                               video.status === 'in_progress' ? 'Processing' :
                               'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'upload' && (
            <div className="space-y-6">
              {/* Upload Instructions */}
              <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">[UPLOAD]</div>
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

              {/* Upload Settings */}
              <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
                <h4 className="text-lg font-semibold text-[#111111] mb-4">Upload Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-2">Auto-categorization</label>
                    <select className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent">
                      <option>Enabled (Recommended)</option>
                      <option>Manual only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111111] mb-2">Video Quality</label>
                    <select className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent">
                      <option>Original quality</option>
                      <option>Optimize for processing</option>
                      <option>Compress for storage</option>
                    </select>
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
                  <p className="text-[#666]">Manage your account preferences and access controls</p>
                </div>

                {/* User Profile Section */}
                <div className="mb-8 pb-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111] mb-4">Profile Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Full Name</label>
                      <input 
                        type="text" 
                        value="Demo User"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111111] mb-1">Email</label>
                      <input 
                        type="email" 
                        value="demo@efference.ai"
                        className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* Access Controls */}
                <div className="mb-8 pb-6 border-b border-[#EEEEEE]">
                  <h4 className="text-lg font-semibold text-[#111111] mb-4">Access Controls</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-[#FAF9EE] rounded-lg border border-[#DCCFC0]">
                      <div>
                        <h5 className="font-medium text-[#111111]">Video Categorization</h5>
                        <p className="text-sm text-[#666]">Access to video categorization tools</p>
                      </div>
                      <span className="px-3 py-1 bg-[#A2AF9B] text-white text-xs rounded-full">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#FAF9EE] rounded-lg border border-[#DCCFC0]">
                      <div>
                        <h5 className="font-medium text-[#111111]">Data Export</h5>
                        <p className="text-sm text-[#666]">Permission to export categorized data</p>
                      </div>
                      <span className="px-3 py-1 bg-[#A2AF9B] text-white text-xs rounded-full">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-[#FAF9EE] rounded-lg border border-[#DCCFC0]">
                      <div>
                        <h5 className="font-medium text-[#111111]">Admin Controls</h5>
                        <p className="text-sm text-[#666]">Administrative dashboard access</p>
                      </div>
                      <span className="px-3 py-1 bg-[#DCCFC0] text-[#666] text-xs rounded-full">Disabled</span>
                    </div>
                  </div>
                </div>


                {/* Save Button */}
                <div className="flex justify-end">
                  <button className="bg-[#A2AF9B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#8fa085] transition-colors">
                    Save Settings
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
                    {selectedVideo.status === 'completed' ? '✅ Completed' :
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
    </div>
  );
}