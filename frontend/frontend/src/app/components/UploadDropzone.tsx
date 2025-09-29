'use client';

import { useState, useCallback } from 'react';

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  s3Key?: string;
}

interface UploadDropzoneProps {
  onUploadComplete?: (files: UploadFile[]) => void;
  onStatusUpdate?: (status: string) => void;
}

export default function UploadDropzone({ onUploadComplete, onStatusUpdate }: UploadDropzoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Signature workflow state
  const [signatureStatus, setSignatureStatus] = useState<'none' | 'pending' | 'signed'>('none');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  
  // Video summary state
  const [showSummaryBox, setShowSummaryBox] = useState(false);
  const [videoSummary, setVideoSummary] = useState('');
  const [isSummarySubmitted, setIsSummarySubmitted] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: generateId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, [addFiles]);

  const uploadFile = async (uploadFile: UploadFile, videoId: string) => {
    const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

    if (uploadFile.size >= MULTIPART_THRESHOLD) {
      return await uploadMultipartFile(uploadFile, videoId);
    } else {
      return await uploadSingleFile(uploadFile, videoId);
    }
  };

  const uploadSingleFile = async (uploadFile: UploadFile, videoId: string) => {
    try {
      // Get presigned URL
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: videoId,
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          fileSize: uploadFile.size,
          userId: 'demo-user'
        }),
      });

      if (!presignedResponse.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const { presignedUrl, fileKey } = await presignedResponse.json();
      
      console.log('Presigned URL generated:', {
        fileKey,
        urlDomain: presignedUrl.split('/')[2],
        urlLength: presignedUrl.length
      });

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Upload to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? { ...f, progress } : f
            ));
          }
        });

        xhr.addEventListener('load', async () => {
          console.log('XHR Load event:', {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText
          });
          
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles(prev => prev.map(f => 
              f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100, s3Key: fileKey } : f
            ));
            
            // Update video record in PostgreSQL
            try {
              await fetch(`/api/sessions/${videoId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uploadStatus: 'completed',
                  s3Key: fileKey,
                  uploadedAt: new Date().toISOString()
                }),
              });
            } catch (error) {
              console.error('Failed to update video record:', error);
            }
            
            resolve();
          } else {
            console.error('Upload failed with status:', {
              status: xhr.status,
              statusText: xhr.statusText,
              responseText: xhr.responseText
            });
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('XHR Error details:', {
            status: xhr.status,
            statusText: xhr.statusText,
            readyState: xhr.readyState,
            responseText: xhr.responseText
          });
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', uploadFile.type);
        xhr.send(uploadFile.file);
      });

    } catch (error) {
      console.error('Upload failed for file:', uploadFile.name, error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'error', progress: 0 } : f
      ));
      
      // Update video record as failed
      try {
        await fetch(`/api/sessions/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadStatus: 'failed'
          }),
        });
      } catch (updateError) {
        console.error('Failed to update video record as failed:', updateError);
      }
    }
  };

  const uploadMultipartFile = async (uploadFile: UploadFile, videoId: string) => {
    try {
      // Step 1: Initiate multipart upload
      const initiateResponse = await fetch('/api/upload/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate',
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          fileSize: uploadFile.size,
          userId: 'demo-user',
          fileId: videoId
        }),
      });

      if (!initiateResponse.ok) {
        throw new Error('Failed to initiate multipart upload');
      }

      const { uploadId, fileKey, fileId, partSize, totalParts } = await initiateResponse.json();

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      // Step 2: Get presigned URLs for all parts
      const partUrlsResponse = await fetch('/api/upload/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPartUrls',
          uploadId,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          fileId,
          userId: 'demo-user'
        }),
      });

      if (!partUrlsResponse.ok) {
        throw new Error('Failed to get part URLs');
      }

      const { partUrls } = await partUrlsResponse.json();

      // Step 3: Upload parts in parallel with multithreading
      const uploadedParts: Array<{PartNumber: number, ETag: string}> = [];
      const maxConcurrentUploads = Math.min(10, totalParts); // Max 10 concurrent uploads
      
      const uploadPart = async (partInfo: {partNumber: number, presignedUrl: string}) => {
        const startByte = (partInfo.partNumber - 1) * partSize;
        const endByte = Math.min(startByte + partSize, uploadFile.size);
        const partData = uploadFile.file.slice(startByte, endByte);

        console.log(`Uploading part ${partInfo.partNumber}: ${startByte}-${endByte} (${partData.size} bytes)`);
        console.log(`Presigned URL: ${partInfo.presignedUrl.substring(0, 100)}...`);

        try {
          const response = await fetch(partInfo.presignedUrl, {
            method: 'PUT',
            body: partData,
            headers: {
              'Content-Type': uploadFile.type,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Part ${partInfo.partNumber} upload failed:`, {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
              url: partInfo.presignedUrl.substring(0, 100) + '...'
            });
            throw new Error(`Failed to upload part ${partInfo.partNumber}: ${response.status} ${response.statusText}`);
          }

          const etag = response.headers.get('ETag');
          if (!etag) {
            console.error(`No ETag received for part ${partInfo.partNumber}`, response.headers);
            throw new Error(`No ETag received for part ${partInfo.partNumber}`);
          }

          console.log(`Part ${partInfo.partNumber} uploaded successfully, ETag: ${etag}`);
          
          return {
            PartNumber: partInfo.partNumber,
            ETag: etag,
          };
        } catch (fetchError) {
          console.error(`Fetch error for part ${partInfo.partNumber}:`, {
            error: fetchError,
            message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
            url: partInfo.presignedUrl.substring(0, 100) + '...'
          });
          throw fetchError;
        }
      };

      // Upload parts in parallel batches
      const uploadPromises: Promise<any>[] = [];
      let completedParts = 0;

      for (let i = 0; i < partUrls.length; i += maxConcurrentUploads) {
        const batch = partUrls.slice(i, i + maxConcurrentUploads);
        const batchPromises = batch.map(async (partInfo: {partNumber: number, presignedUrl: string}) => {
          const result = await uploadPart(partInfo);
          completedParts++;
          
          // Update progress
          const progress = Math.round((completedParts / totalParts) * 100);
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id ? { ...f, progress } : f
          ));
          
          return result;
        });

        const batchResults = await Promise.all(batchPromises);
        uploadedParts.push(...batchResults);
      }

      // Step 4: Complete multipart upload
      const completeResponse = await fetch('/api/upload/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          uploadId,
          fileName: uploadFile.name,
          parts: uploadedParts,
          fileId,
          userId: 'demo-user'
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('Failed to complete multipart upload');
      }

      // Mark as completed
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'completed', progress: 100, s3Key: fileKey } : f
      ));

      // Update video record in DynamoDB
      try {
        await fetch(`/api/sessions/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadStatus: 'completed',
            s3Key: fileKey,
            uploadedAt: new Date().toISOString()
          }),
        });
      } catch (error) {
        console.error('Failed to update video record:', error);
      }

    } catch (error) {
      console.error('Multipart upload failed for file:', uploadFile.name);
      console.error('Error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'error', progress: 0 } : f
      ));
      
      // Update video record as failed
      try {
        await fetch(`/api/sessions/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadStatus: 'failed'
          }),
        });
      } catch (updateError) {
        console.error('Failed to update video record as failed:', updateError);
      }
    }
  };

  const requestSignature = async () => {
    if (files.length === 0 || !userEmail.trim()) return;

    try {
      onStatusUpdate?.('Creating session for signature...');
      
      // Create session with file metadata
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          userName: userName || 'User',
          files: files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create session');
      }

      const { videos } = await sessionResponse.json();
      const newSessionId = videos[0]?.videoId; // Use first video ID as session identifier
      setSessionId(newSessionId);

      onStatusUpdate?.('Sending release form...');

      // Request signature via Documenso
      const signatureResponse = await fetch('/api/signatures/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          userEmail,
          userName: userName || 'User'
        })
      });

      if (!signatureResponse.ok) {
        const error = await signatureResponse.json();
        throw new Error(error.message || 'Failed to send release form');
      }

      const result = await signatureResponse.json();
      setSignatureStatus('pending');
      
      onStatusUpdate?.(`Release form sent to ${userEmail}! Check your email and sign the document.`);

    } catch (error) {
      console.error('Signature request failed:', error);
      onStatusUpdate?.('Failed to send release form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const checkSignatureStatus = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/signatures/create?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to check status');

      const result = await response.json();
      if (result.signatureStatus === 'signed') {
        setSignatureStatus('signed');
        setShowSummaryBox(true);
        onStatusUpdate?.('Release form signed! Please provide a summary of your videos.');
      } else {
        onStatusUpdate?.('Signature still pending. Please check your email.');
      }
    } catch (error) {
      console.error('Failed to check signature status:', error);
      onStatusUpdate?.('Failed to check signature status.');
    }
  };

  const submitSummary = async () => {
    if (!sessionId || !videoSummary.trim()) return;

    try {
      onStatusUpdate?.('Saving video summary...');
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoSummary: videoSummary.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save summary');
      }

      setIsSummarySubmitted(true);
      setShowSummaryBox(false);
      onStatusUpdate?.('Summary saved! You can now upload your files.');

    } catch (error) {
      console.error('Failed to save summary:', error);
      onStatusUpdate?.('Failed to save summary. Please try again.');
    }
  };

  const startUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    onStatusUpdate?.('Uploading files...');

    try {
      // Files should already be created in session during signature request
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadFile(file, sessionId || 'upload-session');
      }

      onStatusUpdate?.('Upload completed!');
      onUploadComplete?.(files);

    } catch (error) {
      console.error('Upload process failed:', error);
      onStatusUpdate?.('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-[#A2AF9B] bg-[#A2AF9B]/5' 
            : 'border-[#DCCFC0] hover:border-[#A2AF9B] hover:bg-[#A2AF9B]/5'
        }`}
      >
        <h5 className="text-lg font-semibold text-[#111111] mb-2">Drag and drop your files or click to browse your computer</h5>
        <input
          type="file"
          multiple
          accept="video/*,.mp4,.webm,.mov"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="bg-[#A2AF9B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#8fa085] transition-colors cursor-pointer"
        >
          Select Files
        </label>
        <p className="text-xs text-[#999] mt-3">Supports: MP4, WebM, MOV up to 10GB each (files &gt;100MB use optimized multipart upload)</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-[#DCCFC0]">
          <div className="p-6 border-b border-[#EEEEEE]">
            <h4 className="text-lg font-semibold text-[#111111]">Selected Files</h4>
            <p className="text-sm text-[#666] mt-1">{files.length} files selected</p>
          </div>
          
          <div className="p-6">
            {/* Signature Workflow */}
            {signatureStatus === 'none' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Step 1: Sign Release Form</h4>
                <p className="text-sm text-blue-800 mb-4">
                  Before uploading, you must sign a release form. This will be sent to your email.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={requestSignature}
                  disabled={!userEmail.trim() || files.length === 0}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Send Release Form to Email
                </button>
              </div>
            )}

            {signatureStatus === 'pending' && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-900 mb-2">Step 1: Signature Pending</h4>
                <p className="text-sm text-orange-800 mb-3">
                  Release form sent to <strong>{userEmail}</strong>. Check your email and sign the document.
                </p>
                <button
                  onClick={checkSignatureStatus}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-700 transition-colors"
                >
                  Check Signature Status
                </button>
              </div>
            )}

            {signatureStatus === 'signed' && !showSummaryBox && !isSummarySubmitted && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Step 1: Release Form Signed ✓</h4>
                <p className="text-sm text-green-800 mb-3">
                  Great! You can now proceed with uploading your files.
                </p>
              </div>
            )}

            {signatureStatus === 'signed' && showSummaryBox && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-3">Step 2: Video Summary</h4>
                <p className="text-sm text-purple-800 mb-4">
                  Please provide a brief summary of your video content. This helps us understand what you're uploading.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-purple-900 mb-2">Video Summary *</label>
                  <textarea
                    value={videoSummary}
                    onChange={(e) => setVideoSummary(e.target.value)}
                    placeholder="e.g., I recorded videos during my bartending shift serving drinks and interacting with customers. Around minute 27, I took a restroom break. The footage shows my typical work routine including mixing cocktails, taking orders, and cleaning glasses throughout the evening shift."
                    className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[100px] resize-vertical"
                    required
                  />
                </div>
                <button
                  onClick={submitSummary}
                  disabled={!videoSummary.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save Summary & Continue
                </button>
              </div>
            )}

            {signatureStatus === 'signed' && isSummarySubmitted && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Step 2: Video Summary Saved ✓</h4>
                <p className="text-sm text-green-800 mb-2">
                  Summary: "{videoSummary}"
                </p>
                <p className="text-sm text-green-800">
                  Ready to upload your files!
                </p>
              </div>
            )}

            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#EEEEEE] rounded flex items-center justify-center">
                      [VIDEO]
                    </div>
                    <div>
                      <h5 className="font-medium text-[#111111]">{file.name}</h5>
                      <p className="text-sm text-[#666]">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {file.status === 'uploading' && (
                      <div className="flex items-center space-x-2">
                        <div className="w-32 bg-[#EEEEEE] rounded-full h-2">
                          <div 
                            className="bg-[#A2AF9B] h-2 rounded-full transition-all duration-300" 
                            style={{width: `${file.progress}%`}}
                          />
                        </div>
                        <span className="text-sm text-[#666]">{file.progress}%</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Completed
                      </span>
                    )}
                    {file.status === 'error' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Error
                      </span>
                    )}
                    {file.status === 'pending' && signatureStatus === 'none' && (
                      <button 
                        onClick={() => removeFile(file.id)}
                        className="text-[#666] hover:text-red-500 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {files.length > 0 && signatureStatus === 'signed' && isSummarySubmitted && !isUploading && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={startUpload}
                  className="bg-[#A2AF9B] text-white px-6 py-3 rounded-md font-medium hover:bg-[#8fa085] transition-colors"
                >
                  Upload All Files
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}