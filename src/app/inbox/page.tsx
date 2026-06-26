'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { MessageCircle, Phone, Mail, RefreshCw, CheckCheck, User, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InboxMessage {
  id: string
  from: string
  fromName: string
  prospectId?: string
  body: string
  channel: 'WHATSAPP' | 'SMS' | 'EMAIL'
  receivedAt: string
  read: boolean
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

const CHANNEL_COLORS = {
  WHATSAPP: 'bg-green-100 text-green-700',
  SMS: 'bg-blue-100 text-blue-700',
  EMAIL: 'bg-purple-100 text-purple-700',
}

const CHANNEL_ICONS = {
  WHATSAPP: '💬',
  SMS: '📱',
  EMAIL: '✉️',
}

export default function InboxPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'UNREAD'>('ALL')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages?limit=100')
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages || [])
      setUnread(data.unread || 0)
      setLastRefresh(new Date())
    } catch {}
    setLoading(false)
  }, [])

  // Chargement initial
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Polling toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const markRead = async (messageId: string) => {
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const markAllRead = async () => {
    const unreadMsgs = messages.filter(m => !m.read)
    await Promise.all(unreadMsgs.map(m => markRead(m.id)))
  }

  const handleMessageClick = async (msg: InboxMessage) => {
    if (!msg.read) await markRead(msg.id)
    if (msg.prospectId) router.push(`/prospects/${msg.prospectId}`)
  }

  const filtered = messages.filter(m => {
    if (filter === 'UNREAD') return !m.read
    if (filter === 'ALL') return true
    return m.channel === filter
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Messagerie"
        subtitle={unread > 0 ? `${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Tous les messages reçus'}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Barre de contrôle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {(['ALL', 'UNREAD', 'WHATSAPP', 'SMS', 'EMAIL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    filter === f
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {f === 'ALL' ? 'Tous' : f === 'UNREAD' ? `Non lus (${unread})` : f}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <button
                onClick={fetchMessages}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tout marquer lu
                </button>
              )}
            </div>
          </div>

          {/* Liste des messages */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucun message</p>
              <p className="text-sm text-gray-400 mt-1">
                {filter === 'UNREAD' ? 'Tous les messages ont été lus' : 'Les messages reçus apparaîtront ici automatiquement'}
              </p>
              <p className="text-xs text-gray-300 mt-4 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Actualisation automatique toutes les 5 secondes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={cn(
                    'bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm',
                    msg.read ? 'border-gray-200' : 'border-brand-300 shadow-sm bg-brand-50/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold',
                      msg.prospectId ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {msg.fromName
                        ? msg.fromName.charAt(0).toUpperCase()
                        : <User className="w-4 h-4" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">
                            {msg.fromName || msg.from}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', CHANNEL_COLORS[msg.channel])}>
                            {CHANNEL_ICONS[msg.channel]} {msg.channel}
                          </span>
                          {!msg.read && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(msg.receivedAt)}</span>
                      </div>

                      <p className="text-sm text-gray-600 truncate">{msg.body}</p>

                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-gray-400">{msg.from}</span>
                        {msg.prospectId && (
                          <span className="text-xs text-brand-600 font-medium">→ Voir la fiche</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info actualisation */}
          {!loading && filtered.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-2 flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Actualisation automatique toutes les 5 secondes
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
