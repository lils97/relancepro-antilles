import { Redis } from '@upstash/redis'

// Client Redis Upstash — variables injectées automatiquement par Vercel
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface InboxMessage {
  id: string
  from: string          // numéro expéditeur
  fromName: string      // nom du prospect si trouvé
  prospectId?: string
  body: string          // contenu du message
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL'
  receivedAt: string    // ISO string
  read: boolean
}

const INBOX_KEY = 'relancepro:inbox'
const MAX_MESSAGES = 200

export async function saveInboxMessage(msg: Omit<InboxMessage, 'id' | 'receivedAt' | 'read'>): Promise<InboxMessage> {
  const message: InboxMessage = {
    ...msg,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    read: false,
  }
  // Prepend dans la liste (plus récent en premier)
  await redis.lpush(INBOX_KEY, JSON.stringify(message))
  // Garder seulement les MAX_MESSAGES derniers
  await redis.ltrim(INBOX_KEY, 0, MAX_MESSAGES - 1)
  return message
}

export async function getInboxMessages(limit = 50): Promise<InboxMessage[]> {
  const raw = await redis.lrange(INBOX_KEY, 0, limit - 1)
  return raw.map(item => {
    if (typeof item === 'string') return JSON.parse(item)
    return item as InboxMessage
  })
}

export async function markMessageRead(messageId: string): Promise<void> {
  const raw = await redis.lrange(INBOX_KEY, 0, MAX_MESSAGES - 1)
  for (let i = 0; i < raw.length; i++) {
    const msg: InboxMessage = typeof raw[i] === 'string' ? JSON.parse(raw[i] as string) : raw[i] as InboxMessage
    if (msg.id === messageId) {
      msg.read = true
      await redis.lset(INBOX_KEY, i, JSON.stringify(msg))
      break
    }
  }
}

export async function getUnreadCount(): Promise<number> {
  const messages = await getInboxMessages(MAX_MESSAGES)
  return messages.filter(m => !m.read).length
}
