'use client';

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
      const sessions = await apiFetch<VideoSession[]>('/sessions/?status=PENDING_REVIEW,PROCESSING');
      setVideoSessions(sessions);
      const tasksData = await backendApi.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers (unchanged functionality)
  const handleClaimVideo = async (sessionId: string) => {
    try {
      console.log('Claiming video for review:', sessionId);
    } catch (error) {
      console.error('Failed to claim video:', error);
    }
  };

  const handleApproveVideo = async (sessionId: string) => {
    try {
      console.log('Approving video:', sessionId);
    } catch (error) {
      console.error('Failed to approve video:', error);
    }
  };

  const handleRejectVideo = async (sessionId: string, reason: string) => {
    try {
      console.log('Rejecting video:', sessionId, 'Reason:', reason);
    } catch (error) {
      console.error('Failed to reject video:', error);
    }
  };

  const filteredSessions = videoSessions.filter(session => {
    if (selectedStatus !== 'all' && session.status !== selectedStatus) return false;
    if (selectedTask !== 'all' && session.task_id !== selectedTask) return false;
    return true;
  });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Brutalist chip (square, thick border, uppercase)
  const chipBase =
    'px-2 py-1 text-xs font-black uppercase border-2 border-white bg-black text-white';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading review queue...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header / Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-black uppercase">Video Review Queue</h2>

        <div className="flex gap-3">
          {/* Status select — brutalist */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border-2 border-white bg-black text-white font-bold uppercase focus:outline-none hover:bg-white hover:text-black"
          >
            <option value="all" className="bg-black">All Statuses</option>
            <option value="PENDING_REVIEW" className="bg-black">Pending Review</option>
            <option value="PROCESSING" className="bg-black">Processing</option>
            <option value="APPROVED" className="bg-black">Approved</option>
            <option value="REJECTED" className="bg-black">Rejected</option>
          </select>

          {/* Task select — brutalist */}
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="px-3 py-2 border-2 border-white bg-black text-white font-bold uppercase focus:outline-none hover:bg-white hover:text-black"
          >
            <option value="all" className="bg-black">All Tasks</option>
            {tasks.map((task) => (
              <option key={task.task_id} value={task.task_id} className="bg-black">
                {task.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 border-2 border-white bg-black">
          <div className="mb-2 font-black uppercase">No videos match the filters</div>
          <p className="text-sm opacity-80">
            Videos will appear here when they are uploaded and ready for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div key={session.session_id} className="bg-black border-2 border-white p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black uppercase">
                    {session.video_name || 'Untitled Video'}
                  </h3>
                  <p className="text-xs opacity-80 mt-1">
                    Task: {session.task?.title || `Task ${session.task_id.slice(0, 8)}`}
                  </p>
                </div>
                <span className={chipBase}>{session.status.replaceAll('_', ' ')}</span>
              </div>

              {/* Meta */}
              <div className="space-y-2 mb-4 text-xs opacity-90">
                <div>
                  <span className="font-bold">Creator:</span>{' '}
                  {session.creator?.name || 'Unknown'}
                </div>
                <div>
                  <span className="font-bold">Email:</span>{' '}
                  {session.user_email || session.creator?.email}
                </div>
                <div>
                  <span className="font-bold">Uploaded:</span> {formatDate(session.created_at)}
                </div>
                {session.task?.description && (
                  <div>
                    <span className="font-bold">Task Description:</span>{' '}
                    {session.task.description}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="border-t-2 border-white pt-4">
                {session.status === 'PENDING_REVIEW' && (
                  <div className="space-y-2">
                    {!session.reviewer_id || session.reviewer_id === currentUser.user_id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveVideo(session.session_id)}
                          className="flex-1 border-2 border-white bg-black text-white py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) handleRejectVideo(session.session_id, reason);
                          }}
                          className="flex-1 border-2 border-white bg-black text-white py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClaimVideo(session.session_id)}
                        className="w-full border-2 border-white bg-black text-white py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
                      >
                        Claim for Review
                      </button>
                    )}
                  </div>
                )}

                {session.status === 'PROCESSING' && (
                  <div className="text-sm text-white text-center py-2 font-bold uppercase">
                    Processing video…
                  </div>
                )}

                {(session.status === 'APPROVED' || session.status === 'REJECTED') && (
                  <div className="text-xs text-white text-center font-bold uppercase">
                    Review completed
                  </div>
                )}
              </div>

              {/* Video processed flag */}
              {session.processed_1080p_s3_key && (
                <div className="mt-4 pt-4 border-t-2 border-white">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-block w-2 h-2 bg-white" />
                    <span className="font-semibold">Video processed and ready for review</span>
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