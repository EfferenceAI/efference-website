
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
      body: typeof options.body === 'string' ? options.body : undefined,
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
    const response = await this.makeRequest<DocumentoCreateResponse>('/documents', {
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

  async addSignatureAndAddressFields(
    documentId: number,
    recipientId: number,
    fieldCoords?: {
      signature?: { pageNumber: number; x: number; y: number; w: number; h: number },
      address?:   { pageNumber: number; x: number; y: number; w: number; h: number }
    }
  ): Promise<{ success: boolean }> {
    const sig = fieldCoords?.signature ?? { pageNumber: 2, x: 26, y: 42, w: 46, h: 7 };
    const addr = fieldCoords?.address   ?? { pageNumber: 2, x: 26, y: 58, w: 55, h: 6 };

    const fields = [
      {
        recipientId,
        type: 'SIGNATURE',
        pageNumber: sig.pageNumber,
        pageX: sig.x, pageY: sig.y,
        pageWidth: sig.w, pageHeight: sig.h
      },
      {
        recipientId,
        type: 'TEXT',
        pageNumber: addr.pageNumber,
        pageX: addr.x, pageY: addr.y,
        pageWidth: addr.w, pageHeight: addr.h,
        fieldMeta: {
          label: 'Address',
          placeholder: '32 New York Street, 41241',
          required: true,
          readOnly: false,
          type: 'text',
          text: '32 New York Street, 41241',
          characterLimit: 40
        }
      }
    ];

    console.log('Adding signature and address fields:', fields)

    return this.makeRequest<{ success: boolean }>(`/documents/${documentId}/fields`, {
      method: 'POST',
      body: JSON.stringify(fields),
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
      const response = await this.makeRequest<{ documents?: unknown[] }>('/documents?limit=1')
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

function base64ToU8(b64: string) {
  const bin = Buffer.from(b64, 'base64');
  return new Uint8Array(bin);
}

type Anchor = { xPct: number; yPct: number; wPct: number; hPct: number };

async function findLabelBoxPercent(
  pdfBase64: string,
  pageNumber: number,
  labelRegex: RegExp,
  opts?: { fieldWidthPct?: number; fieldHeightPct?: number; xPad?: number; yAdjust?: number }
): Promise<Anchor | null> {
  try {
    const pdfjs = await import('pdfjs-dist');
    
    const { fieldWidthPct = 40, fieldHeightPct = 6, xPad = 6, yAdjust = 2 } = opts || {};
    const data = base64ToU8(pdfBase64);

    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale: 1.0 });

    const textContent = await page.getTextContent();

    let hit: unknown = null;

    for (const item of textContent.items as unknown[]) {
      const text = ((item as { str?: string }).str || '').trim();
      if (labelRegex.test(text)) {
        hit = item;
        break;
      }
    }
    if (!hit) return null;

    const [a, , , d, e, f] = (hit as { transform: number[] }).transform;
    const fontSize = Math.hypot(a, d);       
    const textWidthPx = (hit as { width: number }).width;           
    const textHeightPx = fontSize;           

    const pageW = viewport.width;
    const pageH = viewport.height;

    const labelLeft = e;
    const labelBaselineY = f;
    const labelTop = pageH - (labelBaselineY + textHeightPx);

    const fieldLeft = labelLeft + textWidthPx + xPad;
    const fieldTop = labelTop + yAdjust;

    const xPct = (fieldLeft / pageW) * 100;
    const yPct = (fieldTop / pageH) * 100;
    const wPct = fieldWidthPct;
    const hPct = fieldHeightPct;

    return { xPct, yPct, wPct, hPct };
  } catch (error) {
    console.error('Error in findLabelBoxPercent:', error);
    return null;
  }
}

export async function getDocumentFields(documentId: string) {
  try {
    const doc = await documensoClient.getDocumentStatus(documentId);
    console.log('Document fields:', JSON.stringify(doc, null, 2));
    return doc;
  } catch (error) {
    console.error('Failed to get document fields:', error);
    throw error;
  }
}

export async function createUploadAddFieldsSend(
  client: DocumensoClient,
  pdfBase64: string,
  payload: DocumentUploadRequest,
  useAutomaticPositioning: boolean = true,
  fieldCoords?: {
    signature?: { pageNumber: number; x: number; y: number; w: number; h: number },
    address?:   { pageNumber: number; x: number; y: number; w: number; h: number }
  }
) {
  const created = await client.createDocument(payload);
  const documentId = created.documentId;

  await client.uploadPDFToS3(created.uploadUrl, pdfBase64);

  let finalFieldCoords = fieldCoords;
  
  if (useAutomaticPositioning && !fieldCoords) {
    try {
      console.log('Finding signature and address labels in PDF...');
      
      const signatureBox = await findLabelBoxPercent(pdfBase64, 2, /^Signature:/i, {
        fieldWidthPct: 35, fieldHeightPct: 8, xPad: 10, yAdjust: -2
      });
      
      const addressBox = await findLabelBoxPercent(pdfBase64, 2, /^Address:/i, {
        fieldWidthPct: 55, fieldHeightPct: 6, xPad: 10, yAdjust: -2
      });

      if (signatureBox && addressBox) {
        finalFieldCoords = {
          signature: {
            pageNumber: 2,
            x: signatureBox.xPct, y: signatureBox.yPct,
            w: signatureBox.wPct, h: signatureBox.hPct
          },
          address: {
            pageNumber: 2,
            x: addressBox.xPct, y: addressBox.yPct,
            w: addressBox.wPct, h: addressBox.hPct
          }
        };
        
        console.log('Found label positions:', finalFieldCoords);
      } else {
        console.warn('Could not locate Signature/Address labels, using fallback coordinates');
      }
    } catch (error) {
      console.error('Error finding labels, using fallback coordinates:', error);
    }
  }

  const doc = await client.getDocumentStatus(String(documentId));
  if (!doc.recipients?.length) throw new Error("No recipients on document.");

  const recipientIdStr = doc.recipients[0].id;
  const recipientId = Number(recipientIdStr); 

  await client.addSignatureAndAddressFields(
    documentId,
    recipientId,
    finalFieldCoords
  );

  await client.sendDocumentForSigning(documentId, true);

  return { documentId, recipientId };
}

export async function generateReleaseFormPDF(userName: string, userEmail: string, files: Array<{ name: string; size: number }>): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  const maxWidth = pageWidth - (margin * 2)
  
  let yPosition = 20
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('GENERAL COPYRIGHT ASSIGNMENT AND RELEASE', margin, yPosition)
  yPosition += 15
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const agreementText = `This General Copyright Assignment and Release ("Agreement"), effective as of the date of last signature below ("Effective Date"), is entered by and between Remnant Robotics, Inc. ("Company"), and the other party signing below ("Contractor").

1. SCOPE OF SERVICES

1.1. Services. Contractor will provide the following services to Company ("Services"):
Video recording and data collection services including but not limited to: ${files.map((file, index) => `${index + 1}. ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`).join(', ')}.

If Company requests additional services outside the scope of the Services as stated above, the parties will mutually agree upon the scope and terms of those additional services in a mutually-signed, written change order.

1.2. Restrictions. Contractor will perform the Services at its sole expense, and Company will not be responsible to reimburse any expenses of Contractor. Company will enter into all service agreements directly with any of Company's customers. Contractor shall not: (a) make any representation, warranty or covenant on behalf of Company to any customer of Company; (b) enter into any agreement directly with any customer; or (c) bind or purport to bind Company to any obligation with any customer without Company's prior written consent. Contractor must maintain a professional behavior while performing Services, in accordance with any instructions provided by Company. Drugs and/or alcohol are not permitted to be consumed while Contractor is performing any Services. Contractor shall not subcontract or delegate performance of any portion of the Services without the prior written consent of Company.

2. PROPRIETARY RIGHTS; DELIVERY OF WORK; RELEASES TO USE WORK

2.1. Ownership of Work. All imagery, metadata and other deliverables or work product of Contractor created in the course of performing the Services ("Work") is specifically commissioned as a work made for hire by Company, as that term is used in the United States copyright laws, to the greatest extent permitted under applicable law, and Contractor hereby assigns to Company, worldwide and in perpetuity, all right, title and interest, including all copyrights and any other intellectual property rights, in and to the Work. As between Company and Contractor, Company exclusively owns in perpetuity on a worldwide basis all right, title and interest in and to the Work and all elements of the Work that may be captured, created, designed, developed or provided by or for Contractor in the course of performing the Services, and any copyrights and other intellectual property rights embodied in or pertaining to the Work, whether or not accruing during the term of this Agreement, and Company will have the unrestricted right to use, display and distribute the Work in any manner, in any media, throughout the universe, without any obligation to pay compensation except as specifically set forth in this Agreement.`
  
  const lines = doc.splitTextToSize(agreementText, maxWidth)
  
  lines.forEach((line: string) => {
    if (yPosition > 270) { 
      doc.addPage()
      yPosition = 20
    }
    doc.text(line, margin, yPosition)
    yPosition += 4
  })
  
  if (yPosition > 250) {
    doc.addPage()
    yPosition = 20
  }
  
  yPosition += 10
  
  const additionalText = `Company has the right to adapt, change, revise, delete from, add to, rearrange and/or prepare derivative works from the Work, and Contractor expressly waives the benefit of any law, doctrine or principle known as "droit moral," moral rights, artists' rights, rights of artistic integrity or any similar law, doctrine or principle, however denominated. Contractor also expressly waives any and all claims, of any nature whatsoever, that Contractor now has or may hereafter have for infringement of any and all Work and intellectual property rights related to that Work.

2.2. License to Contractor Property and Third-Party Property. If, in the course of providing the Services, Contractor uses or incorporates into any Work any confidential information or other content in which Contractor or a third party has an interest and that is not covered by Section 2.1, Contractor will promptly so inform Company; provided that Contractor will not incorporate any such confidential information or other content into any Work without the prior written consent of Company.

2.3. Delivery of Work; No Retention, Use or Disclosure. Contractor will promptly provide Company with all copies of the Work in the format specified in Section 1.1, if any, and Contractor will deliver those copies in a manner Company specified in writing (email sufficient). Except as otherwise expressly agreed by Company in writing (email sufficient), Contractor will not retain any copies or media related to the Work after delivery to Company.

3. FEES AND PAYMENTS

3.1. Fees. Company will pay Contractor the following fees for the Services: To be determined based on scope of work.

4. WARRANTY

Contractor represents and warrants that: (a) the Services will be performed in a professional and workmanlike manner in accordance with the highest industry standards; (b) all Work produced under this Agreement will be Contractor's original work, and neither the Services nor any Work, nor any development, use, production, distribution or exploitation thereof, will be defamatory or infringe, misappropriate or violate any intellectual property rights, rights of privacy or publicity or other rights of any person or entity.

5. TERM AND TERMINATION

This Agreement will take effect on the Effective Date and, unless earlier terminated in accordance with this Agreement, will remain in effect until all of the Services have been completed.

IN WITNESS WHEREOF, the parties have caused this Agreement to be executed by duly authorized officers or representatives as of the date set forth.

REMNANT ROBOTICS, INC.

Signature: Gianluca Bencomo
Name: Gianluca Bencomo
Title: CEO
Date: ${new Date().toLocaleDateString()}
Address: 1831 Grant Ave, Unit 102
San Francisco, CA 94133


CONTRACTOR:

Signature: _________________________
Name: ${userName}
Email: ${userEmail}
Date: ${new Date().toLocaleDateString()}
Address: _________________________`

  const additionalLines = doc.splitTextToSize(additionalText, maxWidth)
  
  additionalLines.forEach((line: string) => {
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }
    doc.text(line, margin, yPosition)
    yPosition += 4
  })
  
  // Convert to base64
  const pdfBase64 = doc.output('datauristring').split(',')[1]
  return pdfBase64
}

export type { DocumentUploadRequest, DocumentoCreateResponse, DocumentoStatusResponse }