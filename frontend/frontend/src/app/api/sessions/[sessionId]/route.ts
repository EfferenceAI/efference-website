import { NextRequest, NextResponse } from 'next/server'
import { getVideoRecord } from '@/lib/dynamodb'
import { dynamodb, TABLE_NAME } from '@/lib/dynamodb'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const video = await getVideoRecord(sessionId)

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error getting video:', error)
    return NextResponse.json(
      { error: 'Failed to get video' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const updates = await request.json()

    console.log('Updating video record:', sessionId, updates)

    // Update the video record
    const updateExpressions: string[] = []
    const expressionAttributeNames: Record<string, string> = {}
    const expressionAttributeValues: Record<string, unknown> = {}
    
    Object.entries(updates).forEach(([key, value], index) => {
      const attrName = `#attr${index}`
      const attrValue = `:val${index}`
      
      updateExpressions.push(`${attrName} = ${attrValue}`)
      expressionAttributeNames[attrName] = key
      expressionAttributeValues[attrValue] = value
    })

    await dynamodb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { sessionId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }))

    console.log('Video record updated successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating video:', error)
    return NextResponse.json(
      { error: 'Failed to update video', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}