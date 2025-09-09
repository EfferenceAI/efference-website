import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const dynamodb = DynamoDBDocumentClient.from(client)
export const TABLE_NAME = 'uploadz-sessions'

// Simple video record - one per video upload
export interface VideoRecord {
  videoId: string           // Unique ID for this video (primary key)
  videoName: string         // Original filename
  userName: string          // Who uploaded it
  userEmail: string         // User's email
  s3Key: string            // S3 object key
  s3Bucket: string         // S3 bucket name
  fileSize: number         // File size in bytes
  contentType: string      // MIME type (video/mp4, etc)
  duration?: string        // Video length (if available)
  uploadStatus: 'pending' | 'completed' | 'failed'
  uploadedAt: string       // When upload completed
  createdAt: string        // When record was created
}

// Create a video record
export async function createVideoRecord(video: VideoRecord): Promise<void> {
  await dynamodb.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      sessionId: video.videoId, // Using existing table structure
      ...video
    },
  }))
}

// Get a specific video record
export async function getVideoRecord(videoId: string): Promise<VideoRecord | null> {
  const result = await dynamodb.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { sessionId: videoId },
  }))
  
  return result.Item as VideoRecord || null
}