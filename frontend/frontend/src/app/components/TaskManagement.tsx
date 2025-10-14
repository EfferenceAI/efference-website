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

export default function TaskManagement({ currentUser }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState<TaskCreate>({ title: '', description: '', is_active: true });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadTasks();
    loadAssignments();
    loadUsers();
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

  const loadUsers = async () => {
    try {
      // Load workers for task assignment
      const usersData = await backendApi.getUsers({ role: 'WORKER' });
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await backendApi.createTask(newTask);
      setNewTask({ title: '', description: '', is_active: true });
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

  const handleAssignWorker = async (taskId: string, userId: string) => {
    try {
      await backendApi.createTaskAssignment(taskId, userId);
      loadAssignments();
    } catch (error) {
      console.error('Failed to assign worker:', error);
      alert('Failed to assign worker. Please try again.');
    }
  };

  const handleUnassignWorker = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await backendApi.deleteTaskAssignment(assignmentId);
      loadAssignments();
    } catch (error) {
      console.error('Failed to unassign worker:', error);
      alert('Failed to remove assignment. Please try again.');
    }
  };

  const openAssignModal = (task: Task) => {
    setSelectedTask(task);
    setShowAssignModal(true);
  };

  const getTaskAssignments = (taskId: string) => {
    return assignments.filter((assignment) => assignment.task_id === taskId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-black text-white border-2 border-white">
        <div className="font-mono">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black uppercase">Task Management</h2>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="border-2 border-white bg-black text-white px-4 py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
          >
            Create New Task
          </button>
        )}
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <div className="bg-black border-2 border-white p-6">
          <h3 className="text-lg font-black uppercase mb-4">Create New Task</h3>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Task Title</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border-2 border-white bg-black text-white focus:outline-none"
                placeholder="Enter task title"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-2">Description</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-3 py-2 border-2 border-white bg-black text-white focus:outline-none"
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="border-2 border-white bg-black text-white px-4 py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="border-2 border-white bg-black text-white px-4 py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
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
            <div key={task.task_id} className="bg-white border-2 border-gray-400 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black uppercase text-black">{task.title}</h3>
                  <p className="text-xs opacity-80 mt-1 text-black">{task.description}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span
                    className={`px-2 py-1 text-xs font-bold uppercase border-2 ${
                      task.is_active ? 'border-black bg-black text-white' : 'border-gray-400 bg-gray-400 text-white'
                    }`}
                  >
                    {task.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {currentUser.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => openAssignModal(task)}
                        className="text-black underline text-sm hover:text-gray-600 hover:no-underline"
                      >
                        Assign
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.task_id)}
                        className="text-black underline text-sm hover:text-gray-600 hover:no-underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t-2 border-gray-400 pt-4">
                <h4 className="text-xs font-bold uppercase mb-2 text-black">
                  Assigned Workers ({taskAssignments.length})
                </h4>
                {taskAssignments.length === 0 ? (
                  <p className="text-xs opacity-80 text-black">No workers assigned</p>
                ) : (
                  <div className="space-y-1">
                    {taskAssignments.map((assignment) => (
                      <div key={assignment.assignment_id} className="flex items-center justify-between">
                        <span className="text-sm text-black">
                          {assignment.user?.name || 'Unknown User'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] opacity-70 text-black">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </span>
                          {currentUser.role === 'ADMIN' && (
                            <button
                              onClick={() => handleUnassignWorker(assignment.assignment_id)}
                              className="text-black underline text-[11px] hover:text-gray-600 hover:no-underline"
                              title="Remove assignment"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 text-[11px] opacity-70 text-black">
                Created: {new Date(task.created_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <div className="opacity-80 mb-4">No tasks found</div>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="border-2 border-white bg-black text-white px-4 py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
            >
              Create Your First Task
            </button>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-black border-2 border-white p-6 w-full max-w-md">
            <h3 className="text-lg font-black uppercase mb-4">
              Assign Workers to &quot;{selectedTask.title}&quot;
            </h3>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {users
                .filter((user) => user.role === 'WORKER')
                .map((worker) => {
                  const isAssigned = assignments.some(
                    (a) => a.task_id === selectedTask.task_id && a.user_id === worker.user_id
                  );

                  return (
                    <div key={worker.user_id} className="flex items-center justify-between p-2 border-2 border-white">
                      <span className="text-sm">{worker.email}</span>
                      <button
                        onClick={() =>
                          isAssigned
                            ? handleUnassignWorker(
                                assignments.find(
                                  (a) => a.task_id === selectedTask.task_id && a.user_id === worker.user_id
                                )?.assignment_id || ''
                              )
                            : handleAssignWorker(selectedTask.task_id, worker.user_id)
                        }
                        className="border-2 border-white bg-black text-white px-3 py-1 text-xs font-bold uppercase hover:bg-white hover:text-black transition-colors"
                      >
                        {isAssigned ? 'Unassign' : 'Assign'}
                      </button>
                    </div>
                  );
                })}
            </div>

            {users.filter((user) => user.role === 'WORKER').length === 0 && (
              <p className="text-xs opacity-80 text-center py-4">No workers available</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedTask(null);
                }}
                className="border-2 border-white bg-black text-white px-4 py-2 font-bold uppercase hover:bg-white hover:text-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
