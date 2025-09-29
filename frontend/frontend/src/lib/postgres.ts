import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, 
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, 
  query_timeout: 15000,
})

export interface VideoRecord {
  sessionId: string           // UUID primary key
  videoId: string            // UUID video identifier
  videoName: string          // Original filename
  userName: string           // Who uploaded it
  userEmail: string          // User's email
  s3Key: string             // S3 object key
  s3Bucket: string          // S3 bucket name
  fileSize: number          // File size in bytes (BIGINT)
  contentType: string       // MIME type
  uploadStatus: 'pending' | 'completed' | 'failed'
  signatureStatus?: 'none' | 'pending' | 'signed'
  documensoDocumentId?: string    // Documenso document ID
  releaseFormSignedAt?: string // When release form was signed
  files?: Array<{           // For multi-file sessions
    name: string
    size: number
    type: string
  }>
  createdAt: string         // ISO timestamp
  updatedAt: string         // ISO timestamp
  uploadedAt: string        // ISO timestamp
}

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY,
  video_id UUID NOT NULL,
  video_name VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  s3_key VARCHAR(1000) DEFAULT '',
  s3_bucket VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  upload_status VARCHAR(20) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
  signature_status VARCHAR(20) DEFAULT 'none' CHECK (signature_status IN ('none', 'pending', 'signed')),
  documenso_document_id VARCHAR(255),
  release_form_signed_at TIMESTAMPTZ,
  files JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_upload_status ON sessions(upload_status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_video_id ON sessions(video_id);
`

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(CREATE_SESSIONS_TABLE)
    console.log('Postgres sessions table initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  } finally {
    client.release()
  }
}

export async function createVideoRecord(video: VideoRecord): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(`
      INSERT INTO sessions (
        session_id, video_id, video_name, user_name, user_email,
        s3_key, s3_bucket, file_size, content_type, upload_status,
        signature_status, documenso_document_id, 
        release_form_signed_at, files,
        created_at, updated_at, uploaded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (session_id) 
      DO UPDATE SET
        video_name = EXCLUDED.video_name,
        user_name = EXCLUDED.user_name,
        user_email = EXCLUDED.user_email,
        s3_key = EXCLUDED.s3_key,
        s3_bucket = EXCLUDED.s3_bucket,
        file_size = EXCLUDED.file_size,
        content_type = EXCLUDED.content_type,
        upload_status = EXCLUDED.upload_status,
        signature_status = EXCLUDED.signature_status,
        documenso_document_id = EXCLUDED.documenso_document_id,
        release_form_signed_at = EXCLUDED.release_form_signed_at,
        files = EXCLUDED.files,
        updated_at = NOW()
    `, [
      video.sessionId,
      video.videoId,
      video.videoName,
      video.userName,
      video.userEmail,
      video.s3Key || '',
      video.s3Bucket,
      video.fileSize,
      video.contentType,
      video.uploadStatus,
      video.signatureStatus || 'none',
      video.documensoDocumentId || null,
      video.releaseFormSignedAt ? new Date(video.releaseFormSignedAt) : null,
      video.files ? JSON.stringify(video.files) : null,
      new Date(video.createdAt),
      new Date(video.updatedAt || video.createdAt),
      new Date(video.uploadedAt)
    ])
    
    console.log(`Created/updated session: ${video.sessionId}`)
  } catch (error) {
    console.error('Failed to create video record:', error)
    throw error
  } finally {
    client.release()
  }
}

export async function getVideoRecord(sessionId: string): Promise<VideoRecord | null> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        session_id,
        video_id,
        video_name,
        user_name,
        user_email,
        s3_key,
        s3_bucket,
        file_size,
        content_type,
        upload_status,
        signature_status,
        documenso_document_id,
        release_form_signed_at,
        files,
        created_at,
        updated_at,
        uploaded_at
      FROM sessions 
      WHERE session_id = $1
    `, [sessionId])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      sessionId: row.session_id,
      videoId: row.video_id,
      videoName: row.video_name,
      userName: row.user_name,
      userEmail: row.user_email,
      s3Key: row.s3_key,
      s3Bucket: row.s3_bucket,
      fileSize: parseInt(row.file_size),
      contentType: row.content_type,
      uploadStatus: row.upload_status,
      signatureStatus: row.signature_status,
      documensoDocumentId: row.documenso_document_id,
      releaseFormSignedAt: row.release_form_signed_at?.toISOString(),
      files: row.files,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      uploadedAt: row.uploaded_at.toISOString()
    }
  } catch (error) {
    console.error('Failed to get video record:', error)
    throw error
  } finally {
    client.release()
  }
}

export async function updateVideoRecord(sessionId: string, updates: Partial<VideoRecord>): Promise<void> {
  const client = await pool.connect()
  try {
    const setClause: string[] = ['updated_at = NOW()']
    const values: any[] = []
    let paramCount = 1

    Object.entries(updates).forEach(([key, value]) => {
      const dbColumn = key.replace(/([A-Z])/g, '_$1').toLowerCase()
      
      let processedValue: any = value
      if (key.endsWith('At') && value && typeof value === 'string') {
        processedValue = new Date(value)
      }
      
      setClause.push(`${dbColumn} = $${paramCount}`)
      values.push(processedValue)
      paramCount++
    })

    values.push(sessionId)

    await client.query(`
      UPDATE sessions 
      SET ${setClause.join(', ')}
      WHERE session_id = $${paramCount}
    `, values)
    
    console.log(`Updated session: ${sessionId}`)
  } catch (error) {
    console.error('Failed to update video record:', error)
    throw error
  } finally {
    client.release()
  }
}


export async function getUserSessions(userEmail: string, limit = 50): Promise<VideoRecord[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT 
        session_id,
        video_id,
        video_name,
        user_name,
        user_email,
        s3_key,
        s3_bucket,
        file_size,
        content_type,
        upload_status,
        signature_status,
        documenso_document_id,
        release_form_signed_at,
        files,
        created_at,
        updated_at,
        uploaded_at
      FROM sessions 
      WHERE user_email = $1 
      ORDER BY created_at DESC
      LIMIT $2
    `, [userEmail, limit])

    return result.rows.map(row => ({
      sessionId: row.session_id,
      videoId: row.video_id,
      videoName: row.video_name,
      userName: row.user_name,
      userEmail: row.user_email,
      s3Key: row.s3_key,
      s3Bucket: row.s3_bucket,
      fileSize: parseInt(row.file_size),
      contentType: row.content_type,
      uploadStatus: row.upload_status,
      signatureStatus: row.signature_status,
      documensoDocumentId: row.documenso_document_id,
      releaseFormSignedAt: row.release_form_signed_at?.toISOString(),
      files: row.files,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      uploadedAt: row.uploaded_at.toISOString()
    }))
  } finally {
    client.release()
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing database connection...')
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@'))
    
    const { Client } = await import('pg')
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    })
    
    await client.connect()
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('Database connection successful:', {
      time: result.rows[0].current_time,
      version: result.rows[0].pg_version.split(' ')[0]
    })
    await client.end()
    return true
  } catch (error) {
    console.error('Database connection failed:')
    console.error('Error message:', (error as Error).message)
    console.error('Error code:', (error as any).code)
    if ((error as any).code === 'ENOTFOUND') {
      console.error('This suggests the hostname cannot be resolved')
    } else if ((error as any).code === 'ETIMEDOUT') {
      console.error('This suggests a firewall/security group is blocking the connection')
    }
    return false
  }
}

export async function closePool(): Promise<void> {
  await pool.end()
  console.log('Database pool closed')
}

export async function executeQuery(query: string, params: any[] = []): Promise<any> {
  const client = await pool.connect()
  try {
    const result = await client.query(query, params)
    return result
  } finally {
    client.release()
  }
}
