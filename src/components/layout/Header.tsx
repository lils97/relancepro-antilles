'use client'

import { Search, Bell, Plus, User } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Titre */}
      <div>
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      {/* Droite */}
      <div className="flex items-center gap-3">
        {/* Recherche globale */}
        <div className={cn(
          'flex items-center gap-2 transition-all duration-200',
          showSearch ? 'w-72' : 'w-9'
        )}>
          {showSearch ? (
            <div className="flex items-center w-full bg-gray-100 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un prospect..."
                className="flex-1 bg-transparent text-sm outline-none ml-2 text-gray-700 placeholder:text-gray-400"
                autoFocus
                onBlur={() => { if (!searchQuery) setShowSearch(false) }}
              />
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Search className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Nouveau prospect */}
        <Link
          href="/prospects/new"
          className="flex items-center gap-2 bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau</span>
        </Link>

        {/* Avatar */}
        <button className="w-8 h-8 bg-gradient-to-br from-brand-400 to-tropical-teal rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </button>
      </div>
    </header>
  )
}
