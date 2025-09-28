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
          if (xhr.status >= 200 && xhr.status < 300) {
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
            
            resolve();
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
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
            errorBody: errorText
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
      console.error('Multipart upload failed for file:', uploadFile.name, error);
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

  const startUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    onStatusUpdate?.('Creating upload session...');

    try {
      // Create video records - use local API
      const videoResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: 'demo@efference.ai',
          userName: 'Demo User',
          files: files.map(f => ({
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        }),
      });

      if (!videoResponse.ok) {
        throw new Error('Failed to create video records');
      }

      const videoData = await videoResponse.json();
      onStatusUpdate?.('Uploading files...');

      // Upload each file with its corresponding video record
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const videoRecord = videoData.videos[i];
        await uploadFile(file, videoRecord.videoId);
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
        <div className="text-6xl mb-4">[FOLDER]</div>
        <h5 className="text-lg font-semibold text-[#111111] mb-2">Drop videos here</h5>
        <p className="text-[#666] mb-4">or click to browse your computer</p>
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
                    {file.status === 'pending' && (
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

            {files.length > 0 && !isUploading && (
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