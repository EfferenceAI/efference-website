interface DocumentUploadRequest {
  title: string
  externalId?: string
  recipients: Array<{
    name: string
    email: string
    role: 'SIGNER' | 'VIEWER' | 'APPROVER'
    signingOrder?: number
  }>
  meta?: {
    subject?: string
    message?: string
    timezone?: string
    dateFormat?: string
    redirectUrl?: string
    signingOrder?: 'PARALLEL' | 'SEQUENTIAL'
  }
  authOptions?: {
    globalAccessAuth?: 'ACCOUNT' | null
    globalActionAuth?: 'ACCOUNT' | 'PASSKEY' | 'TWO_FACTOR_AUTH' | null
  }
}

interface DocumentoCreateResponse {
  documentId: number
  uploadUrl: string
  recipients: Array<{
    id: string
    email: string
    name?: string
    role: string
    status: 'PENDING' | 'SIGNED' | 'COMPLETED'
    signingUrl?: string
  }>
}

interface DocumentoStatusResponse {
  id: string
  title: string
  status: 'DRAFT' | 'PENDING' | 'COMPLETED' | 'CANCELLED'
  recipients: Array<{
    id: string
    email: string
    name?: string
    role: string
    status: 'PENDING' | 'SIGNED' | 'COMPLETED'
    signedAt?: string
  }>
  completedAt?: string
}

class DocumensoClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.DOCUMENSO_API_KEY!
    this.baseUrl = process.env.DOCUMENSO_BASE_URL || 'https://app.documenso.com'
    
    if (!this.apiKey) {
      throw new Error('DOCUMENSO_API_KEY environment variable is required')
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`
    
    console.log('Documenso API Request:', {
      url,
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body as string) : undefined,
      rawBody: options.body
    })
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    console.log('Documenso API Response:', {
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Documenso API Error:', errorText)
      throw new Error(`Documenso API error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  async createDocument(request: DocumentUploadRequest): Promise<DocumentoCreateResponse> {
    const response = await this.makeRequest<any>('/documents', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    
    console.log('Document creation response:', response)
    return response
  }

  async uploadPDFToS3(uploadUrl: string, pdfBase64: string): Promise<void> {
    // Convert base64 to binary
    const byteCharacters = atob(pdfBase64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)

    console.log('Uploading PDF to S3 presigned URL...', {
      url: uploadUrl,
      size: byteArray.length
    })

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: byteArray,
      headers: {
        'Content-Type': 'application/pdf',
      },
    })

    console.log('S3 upload response:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('S3 upload error:', errorText)
      throw new Error(`S3 upload failed (${response.status}): ${errorText}`)
    }

    console.log('PDF uploaded successfully to S3')
  }

  async getDocumentStatus(documentId: string): Promise<DocumentoStatusResponse> {
    return this.makeRequest<DocumentoStatusResponse>(`/documents/${documentId}`)
  }

  async addSignatureField(documentId: number, recipientId: number): Promise<{ success: boolean }> {
    const signatureFields = [
      {
        type: 'SIGNATURE',
        pageNumber: 1,
        pageX: 20,
        pageY: 211,
        pageWidth: 200,
        pageHeight: 40,
        recipientId: recipientId
      }
    ]
    
    console.log('Adding signature fields:', signatureFields)
    
    return this.makeRequest<{ success: boolean }>(`/documents/${documentId}/fields`, {
      method: 'POST',
      body: JSON.stringify(signatureFields),
    })
  }

  async sendDocumentForSigning(documentId: number, sendEmail: boolean = true): Promise<{ success: boolean }> {
    const requestBody = {
      sendEmail: sendEmail
    }
    
    console.log('Preparing send request with body:', requestBody)
    
    return this.makeRequest<{ success: boolean }>(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.makeRequest<any>('/documents?limit=1')
      return {
        success: true,
        message: `Connected successfully. Found ${response.documents?.length || 0} documents.`
      }
    } catch (error) {
      throw error
    }
  }
}

export const documensoClient = new DocumensoClient()

export function generateReleaseFormPDF(userName: string, userEmail: string, files: Array<{ name: string; size: number }>): string {
  // Import jsPDF properly for server-side usage
  const { jsPDF } = require('jspdf')
  
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(16)
  doc.text('VIDEO RELEASE FORM', 20, 30)
  
  // Add user info
  doc.setFontSize(12)
  doc.text(`Name: ${userName}`, 20, 50)
  doc.text(`Email: ${userEmail}`, 20, 60)
  
  // Add files section
  doc.text('Files being uploaded:', 20, 80)
  let yPosition = 90
  files.forEach((file, index) => {
    const fileSize = Math.round(file.size / 1024 / 1024)
    doc.text(`${index + 1}. ${file.name} (${fileSize}MB)`, 25, yPosition)
    yPosition += 10
  })
  
  // Add agreement text
  yPosition += 10
  doc.text('By signing this document, I confirm that:', 20, yPosition)
  yPosition += 15
  doc.text('1. I own the rights to these video files', 25, yPosition)
  yPosition += 10
  doc.text('2. I grant permission for their use', 25, yPosition)
  yPosition += 10  
  doc.text('3. This is a legally binding agreement', 25, yPosition)
  
  // Add date and signature line
  yPosition += 20
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition)
  yPosition += 20
  doc.text('Signature: ____________________', 20, yPosition)
  
  // Convert to base64
  const pdfBase64 = doc.output('datauristring').split(',')[1]
  return pdfBase64
}

export type { DocumentUploadRequest, DocumentoCreateResponse, DocumentoStatusResponse }