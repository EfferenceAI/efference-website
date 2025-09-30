import { NextRequest, NextResponse } from 'next/server'
import { documensoClient, generateReleaseFormPDF, createUploadAddFieldsSend } from '@/lib/documenso'
import { getVideoRecord, updateVideoRecord } from '@/lib/postgres'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, userEmail, userName } = body

    if (!sessionId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, userEmail' },
        { status: 400 }
      )
    }

    const session = await getVideoRecord(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

  const files = (session.files || []) as Array<{ name: string; size: number }>
    let pdfBase64: string
    
    try {
      pdfBase64 = generateReleaseFormPDF(
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

    await updateVideoRecord(sessionId, {
      signatureStatus: 'pending',
      documensoDocumentId: result.documentId.toString()
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

    if (!sessionId && !documentId) {
      return NextResponse.json(
        { error: 'Either sessionId or documentId is required' },
        { status: 400 }
      )
    }

    let docId = documentId

    // If sessionId provided, get documentId from session
    if (sessionId && !documentId) {
      const session = await getVideoRecord(sessionId)

      if (!session || !session.documensoDocumentId) {
        return NextResponse.json(
          { error: 'No signature request found for this session' },
          { status: 404 }
        )
      }

      docId = session.documensoDocumentId
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
    if (sessionId && isSigned) {
      await updateVideoRecord(sessionId, {
        signatureStatus: 'signed'
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
