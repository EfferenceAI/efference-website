'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#111111] mb-2">Efference</h1>
        <p className="text-[#666]">Redirecting to login...</p>
      </div>
    </div>
  );
}
