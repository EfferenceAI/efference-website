import { NextResponse } from 'next/server'
import { documensoClient } from '@/lib/documenso'

export async function GET() {
  try {
    console.log('Testing Documenso API with full debugging...')
    
    // Test 1: Basic connection
    const result = await documensoClient.testConnection()
    console.log('✅ Basic connection test passed')
    
    // Test 2: Try to create a minimal test document
    console.log('Testing document creation...')
    try {
      const testDoc = await documensoClient.createDocument({
        title: 'Test Document',
        recipients: [{
          name: 'Test User',
          email: 'test@example.com',
          role: 'SIGNER'
        }]
      })
      console.log('✅ Document creation test passed:', testDoc)
      
      return NextResponse.json({
        success: true,
        message: 'All tests passed',
        basicConnection: result.message,
        documentCreation: 'Success',
        testDocument: testDoc,
        apiEndpoint: `${process.env.DOCUMENSO_BASE_URL}/api/v1`,
        timestamp: new Date().toISOString()
      })
      
    } catch (docError) {
      console.error('❌ Document creation test failed:', docError)
      
      return NextResponse.json({
        success: false,
        basicConnection: 'Success',
        documentCreation: 'Failed',
        documentError: docError instanceof Error ? docError.message : 'Unknown error',
        apiEndpoint: `${process.env.DOCUMENSO_BASE_URL}/api/v1`,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Documenso API test failed:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to connect to Documenso API',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}