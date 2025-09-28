'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#111111] mb-2">Efference</h1>
          <p className="text-[#666] text-lg">Robotic Ability Broker</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-[#DCCFC0] p-8">
          <h2 className="text-xl font-semibold text-[#111111] mb-6 text-center">
            Access Dashboard
          </h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#111111] mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#111111] mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCCFC0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#A2AF9B] focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-[#A2AF9B] text-white py-2 px-4 rounded-md hover:bg-[#8fa085] transition-colors font-medium"
            >
              Login
            </button>
          </form>
          
          <p className="text-xs text-[#666] text-center mt-4">
            Demo login - any credentials will work
          </p>
        </div>
      </div>
    </div>
  );
}