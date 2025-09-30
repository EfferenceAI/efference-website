import React, { useState, useEffect } from 'react';
import { backendApi, Task, TaskCreate, TaskAssignment, User } from '@/lib/backend-api';

interface TaskManagementProps {
  currentUser: {
    user_id: string;
    role: string;
    name: string;
    email: string;
  };
}

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export default function TaskManagement({ currentUser }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState<TaskCreate>({ title: '', description: '' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
    loadAssignments();
    // TODO: Load users when user management endpoint is available
  }, []);

  const loadTasks = async () => {
    try {
      const tasksData = await backendApi.getTasks();
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const assignmentsData = await backendApi.getTaskAssignments();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backendApi.createTask(newTask);
      setNewTask({ title: '', description: '' });
      setShowCreateForm(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await backendApi.deleteTask(taskId);
      loadTasks();
      loadAssignments();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const getTaskAssignments = (taskId: string) => {
    return assignments.filter(assignment => assignment.task_id === taskId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#666]">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-[#111111]">Task Management</h2>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#A2AF9B] text-white px-4 py-2 rounded-lg hover:bg-[#8a9784] transition-colors"
          >
            Create New Task
          </button>
        )}
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
          <h3 className="text-lg font-medium text-[#111111] mb-4">Create New Task</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#666] mb-2">
                Task Title
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A2AF9B]"
                placeholder="Enter task title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#666] mb-2">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A2AF9B]"
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-[#A2AF9B] text-white px-4 py-2 rounded-lg hover:bg-[#8a9784] transition-colors"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tasks.map((task) => {
          const taskAssignments = getTaskAssignments(task.task_id);
          return (
            <div key={task.task_id} className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-[#111111]">{task.title}</h3>
                  <p className="text-sm text-[#666] mt-1">{task.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => handleDeleteTask(task.task_id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-[#DCCFC0] pt-4">
                <h4 className="text-sm font-medium text-[#666] mb-2">
                  Assigned Workers ({taskAssignments.length})
                </h4>
                {taskAssignments.length === 0 ? (
                  <p className="text-sm text-[#666]">No workers assigned</p>
                ) : (
                  <div className="space-y-1">
                    {taskAssignments.map((assignment) => (
                      <div key={assignment.assignment_id} className="flex items-center justify-between">
                        <span className="text-sm text-[#111111]">
                          {assignment.user?.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-[#666]">
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-[#666]">
                Created: {new Date(task.created_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[#666] mb-4">No tasks found</div>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#A2AF9B] text-white px-4 py-2 rounded-lg hover:bg-[#8a9784] transition-colors"
            >
              Create Your First Task
            </button>
          )}
        </div>
      )}
    </div>
  );
}