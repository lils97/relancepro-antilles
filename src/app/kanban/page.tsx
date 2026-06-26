'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Plus, MoreHorizontal, Phone, MapPin, Flame } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_ICONS,
  type Prospect, type ProspectStatus,
} from '@/types'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import Link from 'next/link'

// Colonnes Kanban (exclure VOICEMAIL, WAITING_QUOTE, STOP des colonnes principales)
const KANBAN_COLUMNS: { id: ProspectStatus; color: string; bg: string }[] = [
  { id: 'NEW', color: 'border-blue-300', bg: 'bg-blue-50' },
  { id: 'TO_CONTACT', color: 'border-purple-300', bg: 'bg-purple-50' },
  { id: 'CALLBACK', color: 'border-yellow-300', bg: 'bg-yellow-50' },
  { id: 'INTERESTED', color: 'border-orange-300', bg: 'bg-orange-50' },
  { id: 'APPOINTMENT', color: 'border-indigo-300', bg: 'bg-indigo-50' },
  { id: 'QUOTE_SENT', color: 'border-cyan-300', bg: 'bg-cyan-50' },
  { id: 'SIGNED', color: 'border-green-300', bg: 'bg-green-50' },
  { id: 'LOST', color: 'border-red-300', bg: 'bg-red-50' },
]

type ProspectsByStatus = Record<ProspectStatus, Prospect[]>

function KanbanCard({ prospect, isDragging = false }: { prospect: Prospect; isDragging?: boolean }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging,
  } = useSortable({ id: prospect.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white rounded-xl border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm transition-all',
        isDragging && 'shadow-lg rotate-1 scale-105',
        'hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-tropical-teal rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {getInitials(prospect.firstName, prospect.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/prospects/${prospect.id}`}
            onClick={e => e.stopPropagation()}
            className="text-sm font-semibold text-gray-900 hover:text-brand-600 block truncate"
          >
            {prospect.firstName} {prospect.lastName}
          </Link>
          <p className="text-xs text-gray-400">{CATEGORY_ICONS[prospect.category]} {CATEGORY_LABELS[prospect.category]}</p>
        </div>
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full',
          prospect.aiScoreLabel === 'HIGH' && 'bg-red-50 text-red-600',
          prospect.aiScoreLabel === 'MEDIUM' && 'bg-orange-50 text-orange-600',
          prospect.aiScoreLabel === 'LOW' && 'bg-green-50 text-green-600',
        )}>
          {prospect.aiScoreLabel === 'HIGH' && '🔥'}
          {prospect.aiScoreLabel === 'MEDIUM' && '🟠'}
          {prospect.aiScoreLabel === 'LOW' && '🟢'}
          {prospect.aiScore}
        </div>
      </div>

      {prospect.phone && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Phone className="w-3 h-3" />
          {formatPhoneDisplay(prospect.phone)}
        </div>
      )}
      {prospect.city && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <MapPin className="w-3 h-3" />
          {prospect.city}
        </div>
      )}

      {prospect.lastContactAt && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
          {formatRelativeTime(prospect.lastContactAt)}
        </div>
      )}
    </div>
  )
}

function KanbanColumn({
  status, color, bg, prospects,
}: {
  status: ProspectStatus
  color: string
  bg: string
  prospects: Prospect[]
}) {
  return (
    <div className={cn('kanban-column flex flex-col gap-2', bg, `border-t-4 ${color}`, 'min-w-[240px] max-w-[280px]')}>
      {/* Header colonne */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</h3>
          <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-medium">
            {prospects.length}
          </span>
        </div>
        <button className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white text-gray-400 hover:text-gray-600 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cartes */}
      <SortableContext items={prospects.map(p => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {prospects.map(prospect => (
            <KanbanCard key={prospect.id} prospect={prospect} />
          ))}
          {prospects.length === 0 && (
            <div className="flex items-center justify-center h-16 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
              Déposez ici
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export default function KanbanPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])

  useEffect(() => {
    import('@/lib/prospect-store').then(({ getProspects }) => {
      setProspects(getProspects())
    })
  }, [])
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Grouper par statut
  const byStatus: ProspectsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = prospects.filter(p => p.status === col.id)
    return acc
  }, {} as ProspectsByStatus)

  const handleDragStart = (event: DragStartEvent) => {
    const prospect = prospects.find(p => p.id === event.active.id)
    setActiveProspect(prospect ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveProspect(null)

    if (!over) return

    // Si déposé sur une colonne (statut)
    const targetStatus = KANBAN_COLUMNS.find(c => c.id === over.id)?.id
    if (targetStatus && active.id !== over.id) {
      setProspects(prev =>
        prev.map(p => p.id === active.id ? { ...p, status: targetStatus } : p)
      )
    }
  }

  const totalByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = prospects.filter(p => p.status === col.id).length
    return acc
  }, {} as Record<ProspectStatus, number>)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Kanban"
        subtitle={`${prospects.length} prospects en cours • Glissez-déposez pour changer le statut`}
      />

      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full pb-4">
            {KANBAN_COLUMNS.map(col => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                color={col.color}
                bg={col.bg}
                prospects={byStatus[col.id] ?? []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeProspect && (
              <KanbanCard prospect={activeProspect} isDragging />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
