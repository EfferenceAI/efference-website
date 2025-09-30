import React, { useState, useEffect } from 'react';
import { backendApi, Task, TaskAssignment } from '@/lib/backend-api';

interface WorkerTasksProps {
  currentUser: {
    user_id: string;
    role: string;
    name: string;
    email: string;
  };
}

export default function WorkerTasks({ currentUser }: WorkerTasksProps) {
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myAssignments, setMyAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    loadMyAssignments();
  }, [currentUser.user_id]);

  const loadTasks = async () => {
    try {
      const tasksData = await backendApi.getTasks();
      setAvailableTasks(tasksData.filter(task => task.is_active));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadMyAssignments = async () => {
    try {
      const assignmentsData = await backendApi.getTaskAssignments(undefined, currentUser.user_id);
      setMyAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTaskAssigned = (taskId: string) => {
    return myAssignments.some(assignment => assignment.task_id === taskId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#666]">Loading tasks...</div>
      </div>
    );
  }

  const assignedTasks = availableTasks.filter(task => isTaskAssigned(task.task_id));
  const unassignedTasks = availableTasks.filter(task => !isTaskAssigned(task.task_id));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[#111111]">Available Tasks</h2>

      {/* My Assigned Tasks */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[#111111]">My Assigned Tasks</h3>
        {assignedTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <p className="text-[#666]">You don't have any assigned tasks yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedTasks.map((task) => {
              const assignment = myAssignments.find(a => a.task_id === task.task_id);
              return (
                <div key={task.task_id} className="bg-white rounded-lg shadow-sm border border-[#A2AF9B] p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-[#111111]">{task.title}</h4>
                      <p className="text-sm text-[#666] mt-1">{task.description}</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Assigned
                    </span>
                  </div>
                  
                  <div className="text-xs text-[#666] space-y-1">
                    <div>Assigned: {assignment && formatDate(assignment.assigned_at)}</div>
                    <div>Created: {formatDate(task.created_at)}</div>
                  </div>

                  <div className="mt-4">
                    <button 
                      onClick={() => {
                        // TODO: Navigate to upload with this task pre-selected
                        console.log('Upload for task:', task.task_id);
                      }}
                      className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-lg hover:bg-[#8a9784] transition-colors text-sm"
                    >
                      Upload Video for This Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Tasks (Not Assigned) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[#111111]">Other Available Tasks</h3>
        {unassignedTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
            <p className="text-[#666]">No additional tasks are available at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unassignedTasks.map((task) => (
              <div key={task.task_id} className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-medium text-[#111111]">{task.title}</h4>
                    <p className="text-sm text-[#666] mt-1">{task.description}</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Available
                  </span>
                </div>
                
                <div className="text-xs text-[#666] space-y-1">
                  <div>Created: {formatDate(task.created_at)}</div>
                </div>

                <div className="mt-4">
                  <button 
                    onClick={() => {
                      // TODO: Allow workers to request assignment to tasks
                      console.log('Request assignment to task:', task.task_id);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Request Assignment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {availableTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[#666] mb-4">No tasks are available at this time</div>
          <p className="text-sm text-[#666]">Check back later for new tasks or contact your administrator.</p>
        </div>
      )}
    </div>
  );
}