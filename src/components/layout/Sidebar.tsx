'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Upload,
  Columns3,
  MessageSquare,
  Mail,
  Inbox,
  Calendar,
  Sparkles,
  Settings,
  BarChart3,
  FileText,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Wifi,
  Wind,
  Thermometer,
  AirVent,
  LogOut,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navigation = [
  {
    label: 'Principal',
    items: [
      { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/prospects', label: 'Prospects', icon: Users, badge: null },
      { href: '/kanban', label: 'Kanban', icon: Columns3 },
      { href: '/calendar', label: 'Calendrier', icon: Calendar },
    ],
  },
  {
    label: 'Import & Données',
    items: [
      { href: '/import', label: 'Import Excel', icon: Upload },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/inbox', label: 'Messagerie', icon: Inbox },
      { href: '/campaigns', label: 'Campagnes', icon: MessageSquare },
      { href: '/templates', label: 'Templates', icon: FileText },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/ia', label: 'Assistant IA', icon: Sparkles },
      { href: '/analytics', label: 'Analytiques', icon: BarChart3 },
      { href: '/automations', label: 'Automatisations', icon: Zap },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/settings', label: 'Paramètres', icon: Settings },
    ],
  },
]

const categoryShortcuts = [
  { label: 'Fibre', icon: Wifi, color: 'text-sky-500', href: '/prospects?cat=INTERNET_FIBRE' },
  { label: 'Solaire', icon: Sun, color: 'text-amber-500', href: '/prospects?cat=PANNEAUX_SOLAIRES' },
  { label: 'Isolation', icon: Thermometer, color: 'text-green-500', href: '/prospects?cat=ISOLATION_THERMIQUE' },
  { label: 'Clim', icon: AirVent, color: 'text-indigo-500', href: '/prospects?cat=CLIMATISATION' },
  { label: 'Brasseurs', icon: Wind, color: 'text-teal-500', href: '/prospects?cat=BRASSEURS_AIR' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages?limit=50')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unread || 0)
        }
      } catch {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-gray-200 px-4',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-tropical-teal rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">RP</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-sm text-gray-900 leading-tight">RelancePro</p>
            <p className="text-xs text-brand-600 font-medium">Antilles</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navigation.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'sidebar-item',
                        isActive && 'active',
                        !isActive && 'text-gray-600',
                        collapsed && 'justify-center px-2'
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="flex-1">{item.label}</span>}
                      {!collapsed && item.href === '/inbox' && unreadCount > 0 && (
                        <span className="ml-auto bg-brand-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                      {collapsed && item.href === '/inbox' && unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {/* Raccourcis catégories */}
        {!collapsed && (
          <div>
            <p className="px-3 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Par activité
            </p>
            <div className="grid grid-cols-5 gap-1 px-2">
              {categoryShortcuts.map((cat) => {
                const Icon = cat.icon
                return (
                  <Link
                    key={cat.label}
                    href={cat.href}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    title={cat.label}
                  >
                    <Icon className={cn('w-4 h-4', cat.color)} />
                    <span className="text-[9px] text-gray-500 font-medium">{cat.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-2">
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'sidebar-item w-full text-gray-500',
            collapsed && 'justify-center'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
