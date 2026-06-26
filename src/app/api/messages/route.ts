import { NextRequest, NextResponse } from 'next/server'
import { getInboxMessages, markMessageRead, getUnreadCount } from '@/lib/redis'

// GET /api/messages — liste des messages entrants
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')

  try {
    const messages = await getInboxMessages(limit)
    const unread = messages.filter(m => !m.read).length
    return NextResponse.json({ messages, unread })
  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json({ messages: [], unread: 0 })
  }
}

// PATCH /api/messages — marquer comme lu
export async function PATCH(request: NextRequest) {
  try {
    const { messageId } = await request.json()
    if (!messageId) return NextResponse.json({ error: 'messageId requis' }, { status: 400 })
    await markMessageRead(messageId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}
