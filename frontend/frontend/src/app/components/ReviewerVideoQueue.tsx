import React, { useState, useEffect } from 'react';
import { backendApi, Task } from '@/lib/backend-api';
import { apiFetch } from '@/lib/api';

interface VideoSession {
  session_id: string;
  creator_id: string;
  task_id: string;
  reviewer_id?: string;
  status: string;
  video_name?: string;
  user_email?: string;
  raw_concatenated_s3_key?: string;
  processed_1080p_s3_key?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    user_id: string;
    name: string;
    email: string;
  };
  task?: {
    task_id: string;
    title: string;
    description: string;
  };
}

interface ReviewerVideoQueueProps {
  currentUser: {
    user_id: string;
    role: string;
    name: string;
    email: string;
  };
}

export default function ReviewerVideoQueue({ currentUser }: ReviewerVideoQueueProps) {
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load video sessions that need review
      const sessions = await apiFetch<VideoSession[]>('/sessions?status=PENDING_REVIEW,PROCESSING');
      setVideoSessions(sessions);
      
      // Load tasks for filtering
      const tasksData = await backendApi.getTasks();
      setTasks(tasksData);
      
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimVideo = async (sessionId: string) => {
    try {
      // TODO: Implement claim video for review
      console.log('Claiming video for review:', sessionId);
      // This would update the reviewer_id field to current user
    } catch (error) {
      console.error('Failed to claim video:', error);
    }
  };

  const handleApproveVideo = async (sessionId: string) => {
    try {
      // TODO: Implement approve video
      console.log('Approving video:', sessionId);
      // This would update the status to APPROVED
    } catch (error) {
      console.error('Failed to approve video:', error);
    }
  };

  const handleRejectVideo = async (sessionId: string, reason: string) => {
    try {
      // TODO: Implement reject video with reason
      console.log('Rejecting video:', sessionId, 'Reason:', reason);
      // This would update the status to REJECTED
    } catch (error) {
      console.error('Failed to reject video:', error);
    }
  };

  const filteredSessions = videoSessions.filter(session => {
    if (selectedStatus !== 'all' && session.status !== selectedStatus) return false;
    if (selectedTask !== 'all' && session.task_id !== selectedTask) return false;
    return true;
  });

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
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#666]">Loading review queue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#111111]">Video Review Queue</h2>
        <div className="flex gap-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-[#DCCFC0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A2AF9B]"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="PROCESSING">Processing</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="px-3 py-2 border border-[#DCCFC0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A2AF9B]"
          >
            <option value="all">All Tasks</option>
            {tasks.map((task) => (
              <option key={task.task_id} value={task.task_id}>
                {task.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-[#666] mb-4">No videos found matching the selected filters</div>
          <p className="text-sm text-[#666]">Videos will appear here when they are uploaded and ready for review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div key={session.session_id} className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-[#111111]">
                    {session.video_name || 'Untitled Video'}
                  </h3>
                  <p className="text-sm text-[#666] mt-1">
                    Task: {session.task?.title || `Task ${session.task_id.slice(0, 8)}`}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(session.status)}`}>
                  {session.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs text-[#666]">
                  <strong>Creator:</strong> {session.creator?.name || 'Unknown'}
                </div>
                <div className="text-xs text-[#666]">
                  <strong>Email:</strong> {session.user_email || session.creator?.email}
                </div>
                <div className="text-xs text-[#666]">
                  <strong>Uploaded:</strong> {formatDate(session.created_at)}
                </div>
                {session.task?.description && (
                  <div className="text-xs text-[#666]">
                    <strong>Task Description:</strong> {session.task.description}
                  </div>
                )}
              </div>

              {/* Review Actions */}
              <div className="border-t border-[#DCCFC0] pt-4">
                {session.status === 'PENDING_REVIEW' && (
                  <div className="space-y-2">
                    {!session.reviewer_id || session.reviewer_id === currentUser.user_id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveVideo(session.session_id)}
                          className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) handleRejectVideo(session.session_id, reason);
                          }}
                          className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClaimVideo(session.session_id)}
                        className="w-full bg-[#A2AF9B] text-white py-2 px-3 rounded-lg hover:bg-[#8a9784] transition-colors text-sm"
                      >
                        Claim for Review
                      </button>
                    )}
                  </div>
                )}

                {session.status === 'PROCESSING' && (
                  <div className="text-sm text-blue-600 text-center py-2">
                    Processing video...
                  </div>
                )}

                {(session.status === 'APPROVED' || session.status === 'REJECTED') && (
                  <div className="text-xs text-[#666] text-center">
                    Review completed
                  </div>
                )}
              </div>

              {/* Video Preview */}
              {session.processed_1080p_s3_key && (
                <div className="mt-4 pt-4 border-t border-[#DCCFC0]">
                  <div className="flex items-center gap-2 text-sm text-[#A2AF9B]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    Video processed and ready for review
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}