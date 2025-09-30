'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, User } from '@/lib/auth';
import UploadDropzone from '../components/UploadDropzone';

export default function UploadPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getMe();
        setMe(user);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAF9EE] flex items-center justify-center">
        <div className="text-[#666]">Loading...</div>
      </div>
    );
  }

  if (!me) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF9EE]">
      {/* Header */}
      <header className="bg-white border-b border-[#DCCFC0] px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Upload Videos</h1>
            <p className="text-[#666] mt-1">Upload videos for training and review</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#A2AF9B] text-white px-4 py-2 rounded-lg hover:bg-[#8B9B8C] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Upload Instructions */}
          <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
            <h2 className="text-lg font-semibold text-[#111111] mb-3">Upload Instructions</h2>
            <div className="text-[#666] space-y-2">
              <p>• Supported formats: MP4, WebM, MOV</p>
              <p>• Maximum file size: 5GB per file</p>
              <p>• Videos will be processed and may require review depending on content</p>
              <p>• You&apos;ll need to sign a release form before uploading</p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
            <h2 className="text-lg font-semibold text-[#111111] mb-4">Upload Files</h2>
            {uploadStatus && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{uploadStatus}</p>
              </div>
            )}
            <UploadDropzone
              onUploadComplete={(files) => {
                console.log('Upload completed:', files);
                setUploadStatus(`Successfully uploaded ${files.length} files!`);
                // After successful upload, redirect to gallery
                setTimeout(() => {
                  router.push('/gallery');
                }, 2000);
              }}
              onStatusUpdate={setUploadStatus}
            />
          </div>

          {/* Upload Tips */}
          <div className="bg-white rounded-lg border border-[#DCCFC0] p-6">
            <h2 className="text-lg font-semibold text-[#111111] mb-3">Upload Tips</h2>
            <div className="text-[#666] space-y-2">
              <p>• Ensure good lighting and clear video quality</p>
              <p>• Include audio if relevant to the training content</p>
              <p>• Use descriptive filenames for better organization</p>
              <p>• Check your internet connection for large files</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
