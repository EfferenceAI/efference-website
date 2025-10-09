'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { backendApi, Task, TaskAssignment } from '@/lib/backend-api';

interface WorkerTasksProps {
  currentUser: {
    user_id: string;
    role: string;
    name: string;
    email: string;
  };
  onNavigateToUpload?: (taskId: string, taskTitle: string) => void;
}

export default function WorkerTasks({ currentUser, onNavigateToUpload }: WorkerTasksProps) {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingAssignment, setRequestingAssignment] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const tasksData = await backendApi.getTasks();
      const activeTasks = tasksData.filter(task => task.is_active);
      setAvailableTasks(activeTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  const loadMyAssignments = useCallback(async () => {
    try {
      const assignmentsData = await backendApi.getTaskAssignments(undefined, currentUser.user_id);
      setMyAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.user_id]);

  useEffect(() => {
    loadTasks();
    loadMyAssignments();
  }, [loadTasks, loadMyAssignments]);

  const isTaskAssigned = (taskId: string) => {
    return myAssignments.some(assignment => assignment.task_id === taskId);
  };

  const handleRequestAssignment = async (taskId: string) => {
    setRequestingAssignment(taskId);
    try {
      await backendApi.createTaskAssignment(taskId);
      await loadMyAssignments();
      alert('Assignment request submitted successfully!');
    } catch (error) {
      console.error('Failed to request assignment:', error);
      alert('Failed to request assignment. Please try again.');
    } finally {
      setRequestingAssignment(null);
    }
  };

  const handleUnassignTask = async (taskId: string) => {
    const assignment = myAssignments.find(a => a.task_id === taskId);
    if (!assignment) return;
    try {
      await backendApi.deleteTaskAssignment(assignment.assignment_id);
      await loadMyAssignments();
      alert('Successfully unassigned from task!');
    } catch (error) {
      console.error('Failed to unassign task:', error);
      alert('Failed to unassign task. Please try again.');
    }
  };

  const handleUploadForTask = (taskId: string, taskTitle: string) => {
    if (onNavigateToUpload) {
      onNavigateToUpload(taskId, taskTitle);
    } else {
      localStorage.setItem('selectedTaskId', taskId);
      localStorage.setItem('selectedTaskTitle', taskTitle);
      window.location.hash = '#upload';
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading tasks...</div>
      </div>
    );
  }

  const assignedTasks = availableTasks.filter(task => isTaskAssigned(task.task_id));
  const unassignedTasks = availableTasks.filter(task => !isTaskAssigned(task.task_id));

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-black border-2 border-white p-6">{children}</div>
  );

  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span className="px-2 py-1 text-xs font-black uppercase border-2 border-white bg-black text-white">
      {children}
    </span>
  );

  const Btn = ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full border-2 border-white bg-black text-white py-3 font-bold uppercase transition-colors
                  hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-8 text-white">
      <h2 className="text-xl font-black uppercase">Available Tasks</h2>

      {/* My Assigned Tasks */}
      <section className="space-y-4">
        <h3 className="text-lg font-black uppercase">My Assigned Tasks</h3>
        {assignedTasks.length === 0 ? (
          <Card>
            <p className="text-sm opacity-80">You don&apos;t have any assigned tasks yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedTasks.map(task => {
              const assignment = myAssignments.find(a => a.task_id === task.task_id);
              return (
                <Card key={task.task_id}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-black uppercase">{task.title}</h4>
                      <p className="text-xs opacity-80 mt-1">{task.description}</p>
                    </div>
                    <Chip>Assigned</Chip>
                  </div>

                  <div className="text-xs opacity-80 space-y-1">
                    <div>Assigned: {assignment && formatDate(assignment.assigned_at)}</div>
                    <div>Created: {formatDate(task.created_at)}</div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Btn onClick={() => handleUploadForTask(task.task_id, task.title)}>
                      Upload Video for This Task
                    </Btn>
                    <Btn onClick={() => handleUnassignTask(task.task_id)}>Unassign from Task</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Other Available Tasks */}
      <section className="space-y-4">
        <h3 className="text-lg font-black uppercase">Other Available Tasks</h3>
        {unassignedTasks.length === 0 ? (
          <Card>
            <p className="text-sm opacity-80">No additional tasks are available at this time.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unassignedTasks.map(task => (
              <Card key={task.task_id}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-black uppercase">{task.title}</h4>
                    <p className="text-xs opacity-80 mt-1">{task.description}</p>
                  </div>
                  <Chip>Available</Chip>
                </div>

                <div className="text-xs opacity-80 space-y-1">
                  <div>Created: {formatDate(task.created_at)}</div>
                </div>

                <div className="mt-4">
                  <Btn
                    onClick={() => handleRequestAssignment(task.task_id)}
                    disabled={requestingAssignment === task.task_id}
                  >
                    {requestingAssignment === task.task_id ? 'Requesting…' : 'Request Assignment'}
                  </Btn>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {availableTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="mb-2">No tasks are available at this time</div>
          <p className="text-sm opacity-80">Check back later for new tasks or contact your administrator.</p>
        </div>
      )}
    </div>
  );
}
