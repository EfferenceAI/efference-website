import { NextRequest, NextResponse } from 'next/server'
import { getDocumentFields } from '@/lib/documenso'

export async function GET(request: NextRequest) {
  try {
    const documentId = 'efjdOcgv6kNAwsS5mLIvf'
    
    console.log('Fetching field positions from document:', documentId)
    const doc = await getDocumentFields(documentId)
    
    return NextResponse.json({
      success: true,
      documentId,
      fields: doc,
      message: 'Check console for detailed field positions'
    })
  } catch (error) {
    console.error('Error fetching document fields:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch document fields',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}