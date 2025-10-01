'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, User } from '@/lib/auth';
import TaskManagement from '@/app/components/TaskManagement';

export default function TasksPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getMe();
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to load user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#111111] mb-8">Task Management</h1>
        <TaskManagement currentUser={currentUser} />
      </div>
    </div>
  );
}