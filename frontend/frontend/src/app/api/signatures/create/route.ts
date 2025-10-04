import { NextRequest, NextResponse } from 'next/server'
import { documensoClient, generateReleaseFormPDF, createUploadAddFieldsSend } from '@/lib/documenso'

// Backend API client for fetching session data
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://gm6cgy8uoa.execute-api.us-east-1.amazonaws.com/prod'

interface BackendVideoSession {
  session_id: string
  creator_id: string
  task_id: string
  status: string
  video_name?: string
  user_email?: string
  s3_bucket?: string
  file_size?: number
  content_type?: string
  upload_status?: string
  signature_status?: string
  documenso_document_id?: string
  release_form_signed_at?: string
  created_at: string
  updated_at: string
}

async function getBackendSession(sessionId: string, token: string): Promise<BackendVideoSession | null> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`Failed to fetch session: ${response.status}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching backend session:', error)
    return null
  }
}

async function updateBackendSession(sessionId: string, token: string, updates: Partial<BackendVideoSession>): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    
    return response.ok
  } catch (error) {
    console.error('Error updating backend session:', error)
    return false
  }
}

async function getUserSignedSession(userEmail: string, token: string): Promise<BackendVideoSession | null> {
  try {
    // Get all sessions for this user, filtered by signed status
    const response = await fetch(`${BACKEND_BASE_URL}/sessions/?user_email=${encodeURIComponent(userEmail)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const sessions: BackendVideoSession[] = await response.json()
    // Find the first session with a signed release form
    return sessions.find(s => s.signature_status === 'signed' && s.documenso_document_id) || null
  } catch (error) {
    console.error('Error fetching user signed sessions:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userEmail, userName, token } = body

    if (!sessionId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userEmail' },
        { status: 400 }
      )
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication token required' },
        { status: 401 }
      )
    }

    const session = await getBackendSession(sessionId, token)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if document has already been signed
    if (session.signature_status === 'signed' && session.documenso_document_id) {
      return NextResponse.json({
        success: true,
        documentId: parseInt(session.documenso_document_id),
        emailSent: false,
        alreadySigned: true,
        message: 'Release form has already been signed for this session.'
      })
    }

    // Check if user has any signed document from previous sessions
    const existingSignedSession = await getUserSignedSession(userEmail, token)
    if (existingSignedSession && existingSignedSession.documenso_document_id) {
      // Update current session to reference the existing signed document
      await updateBackendSession(sessionId, token, {
        signature_status: 'signed',
        documenso_document_id: existingSignedSession.documenso_document_id,
        release_form_signed_at: existingSignedSession.release_form_signed_at
      })
      
      return NextResponse.json({
        success: true,
        documentId: parseInt(existingSignedSession.documenso_document_id),
        emailSent: false,
        alreadySigned: true,
        message: 'You have already signed a release form previously. Using existing signature.'
      })
    }

    // Check if document is pending and exists
    if (session.signature_status === 'pending' && session.documenso_document_id) {
      try {
        // Verify the document still exists in Documenso
        const documentStatus = await documensoClient.getDocumentStatus(session.documenso_document_id)
        
        // If document is completed or signed, update our database
        const isSigned = documentStatus.status === 'COMPLETED' || 
                        documentStatus.recipients.some(r => r.status === 'SIGNED' || r.status === 'COMPLETED')
        
        if (isSigned) {
          await updateBackendSession(sessionId, token, {
            signature_status: 'signed'
          })
          
          return NextResponse.json({
            success: true,
            documentId: parseInt(session.documenso_document_id),
            emailSent: false,
            alreadySigned: true,
            message: 'Release form has already been signed for this session.'
          })
        }
        
        // Document exists and is still pending, return existing document info
        return NextResponse.json({
          success: true,
          documentId: parseInt(session.documenso_document_id),
          emailSent: false,
          alreadyPending: true,
          message: 'Release form has already been sent. Check your email to sign the document.'
        })
        
      } catch (docCheckError) {
        console.error('Error checking existing document status:', docCheckError)
        // Continue with creating new document if check fails
      }
    }

    // Generate PDF with video file information (if available)
    const files = session.video_name ? [{ name: session.video_name, size: session.file_size || 0 }] : []
    let pdfBase64: string
    
    try {
      pdfBase64 = await generateReleaseFormPDF(
        (userName as string) || 'User',
        userEmail as string,
        files.map((f) => ({ name: f.name, size: f.size }))
      )
      console.log('PDF generated successfully, length:', pdfBase64.length)
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError)
      throw new Error('Failed to generate PDF: ' + (pdfError instanceof Error ? pdfError.message : 'Unknown error'))
    }

    const documentTitle = `Video Release Form - ${userName || userEmail}`
    console.log('Creating and sending document using helper function...')
    
    const payload = {
      title: documentTitle,
      recipients: [{
        name: userName || 'User',
        email: userEmail,
        role: 'SIGNER' as const,
        signingOrder: 0
      }],
      meta: {
        subject: 'Please sign the release form',
        message: 'Add your address and sign, then submit.',
        signingOrder: 'SEQUENTIAL' as const
      }
    } satisfies import('@/lib/documenso').DocumentUploadRequest
    
    const result = await createUploadAddFieldsSend(
      documensoClient,
      pdfBase64,
      payload,
      true 
    );

    console.log('Document creation and sending completed:', result)

    await updateBackendSession(sessionId, token, {
      signature_status: 'pending',
      documenso_document_id: result.documentId.toString()
    })

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      emailSent: true,
      message: 'Release form sent to your email! Check your inbox and sign the document.'
    })

  } catch (error) {
    console.error('Error creating signature request:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create signature request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const documentId = searchParams.get('documentId')
    const token = searchParams.get('token')

    if (!sessionId && !documentId) {
      return NextResponse.json(
        { error: 'Either sessionId or documentId is required' },
        { status: 400 }
      )
    }

    let docId = documentId

    // If sessionId provided, get documentId from session
    if (sessionId && !documentId) {
      if (!token) {
        return NextResponse.json(
          { error: 'Authentication token required' },
          { status: 401 }
        )
      }

      const session = await getBackendSession(sessionId, token)

      if (!session || !session.documenso_document_id) {
        return NextResponse.json(
          { error: 'No signature request found for this session' },
          { status: 404 }
        )
      }

      docId = session.documenso_document_id
    }

    if (!docId) {
      return NextResponse.json(
        { error: 'Document ID not found' },
        { status: 404 }
      )
    }

    // Check signature status with Documenso
    const documentStatus = await documensoClient.getDocumentStatus(docId)

    const isSigned = documentStatus.status === 'COMPLETED' || 
                    documentStatus.recipients.some(r => r.status === 'SIGNED' || r.status === 'COMPLETED')

    // Update session if signature is completed
    if (sessionId && isSigned && token) {
      await updateBackendSession(sessionId, token, {
        signature_status: 'signed'
      })
    }

    return NextResponse.json({
      documentId: docId,
      status: documentStatus.status,
      signatureStatus: isSigned ? 'signed' : 'pending',
      recipients: documentStatus.recipients,
      completedAt: documentStatus.completedAt
    })

  } catch (error) {
    console.error('Error checking signature status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to check signature status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
