import { NextRequest, NextResponse } from 'next/server'
import { documensoClient, generateReleaseFormPDF } from '@/lib/documenso'
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

    const files = session.files || []
    let pdfBase64: string
    
    try {
      pdfBase64 = generateReleaseFormPDF(
        userName || 'User',
        userEmail,
        files.map((f: any) => ({ name: f.name, size: f.size }))
      )
      console.log('PDF generated successfully, length:', pdfBase64.length)
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError)
      throw new Error('Failed to generate PDF: ' + pdfError.message)
    }

    const documentTitle = `Video Release Form - ${userName || userEmail}`
    console.log('Step 1: Creating Documenso document metadata...')
    
    const createRequest = {
      title: documentTitle,
      recipients: [{
        name: userName || 'User',
        email: userEmail,
        role: 'SIGNER'
      }],
      meta: {
        signingOrder: 'PARALLEL'
      }
    }
    
    console.log('Document creation request:', JSON.stringify(createRequest, null, 2))
    
    const document = await documensoClient.createDocument(createRequest)

    console.log('Document metadata created successfully:', document)
    
    if (!document.documentId || !document.uploadUrl) {
      throw new Error('Document ID or upload URL missing from Documenso response')
    }
    
    console.log('Step 2: Uploading PDF to S3...')
    await documensoClient.uploadPDFToS3(document.uploadUrl, pdfBase64)
    
    console.log('Step 3: Sending document for signing via email...')
    console.log('About to call sendDocumentForSigning with:', { documentId: document.documentId, sendEmail: true })
    await documensoClient.sendDocumentForSigning(document.documentId, true)

    await updateVideoRecord(sessionId, {
      signatureStatus: 'pending',
      documensoDocumentId: document.documentId.toString()
    })

    const signingUrl = document.recipients[0]?.signingUrl

    return NextResponse.json({
      success: true,
      documentId: document.documentId,
      signingUrl: document.recipients[0]?.signingUrl,
      emailSent: true,
      message: 'Release form sent to your email! Check your inbox and sign the document.',
      directSigningUrl: document.recipients[0]?.signingUrl
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
