'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import SwipeCard from './SwipeCard'
import type { SwipeItem, SwipeDirection } from '@/types'

const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const

interface CardStackProps {
  initialItems: SwipeItem[]
  onItemSwiped: (item: SwipeItem, direction: SwipeDirection) => void
  onItemSave?: (item: SwipeItem) => void
  onItemDetail?: (item: SwipeItem) => void
  onEmpty?: () => void
  currentIndex: number
}

export default function CardStack({
  initialItems,
  onItemSwiped,
  onItemSave,
  onItemDetail,
  onEmpty,
  currentIndex,
}: CardStackProps) {
  const [items, setItems] = useState<SwipeItem[]>(initialItems)
  const total = initialItems.length

  const handleSwipe = (direction: SwipeDirection) => {
    if (items.length === 0) return
    const topItem = items[0]
    onItemSwiped(topItem, direction)
    setItems(prev => {
      const next = prev.slice(1)
      if (next.length === 0) onEmpty?.()
      return next
    })
  }

  const visible = items.slice(0, 3)

  useEffect(() => {
    const upcoming = items.slice(1, 11)
    upcoming.forEach((item) => {
      if (!item.imageUrl) return
      const img = new Image()
      img.src = item.imageUrl
    })
  }, [items])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#111' }}>
      {/* Progress bar — story style */}
      {total > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '14px 16px 0',
          display: 'flex',
          gap: 4,
        }}>
          {Array.from({ length: Math.min(total, 12) }).map((_, i) => {
            const segTotal = Math.min(total, 12)
            const filled = Math.round((currentIndex / total) * segTotal)
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 2,
                  borderRadius: 2,
                  background: i < filled
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.28)',
                  transition: 'background 0.2s',
                }}
              />
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          textAlign: 'center',
          background: '#F7F7F5',
        }}>
          <span style={{ fontSize: 56, marginBottom: 20 }}>🎉</span>
          <h2 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 26,
            fontWeight: 700,
            color: '#0F0F0F',
            margin: '0 0 10px',
          }}>
            Ты всё просмотрел
          </h2>
          <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15, color: '#6B6B6B', margin: '0 0 28px', lineHeight: 1.5 }}>
            Возвращайся позже — мы готовим новую подборку
          </p>
          <Link
            href="/feed"
            style={{
              display: 'inline-block',
              height: 48,
              padding: '0 28px',
              borderRadius: 100,
              border: 'none',
              background: '#FF4D4D',
              color: '#FFFFFF',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              textAlign: 'center',
              lineHeight: '48px'
            }}
          >
            Обновить ленту
          </Link>
        </div>
      )}

      {/* Cards — stacked absolutely */}
      <AnimatePresence>
        {[...visible].reverse().map((item, revIdx) => {
          const logicalIdx = visible.length - 1 - revIdx
          const isTop = logicalIdx === 0
          const depth = logicalIdx

          return (
            <motion.div
              key={item.id}
              id={`card-${item.id}`}
              style={{ position: 'absolute', inset: 0, zIndex: visible.length - depth }}
              initial={{ scale: 1 - depth * 0.04, y: depth * 14 }}
              animate={{ scale: 1 - depth * 0.04, y: depth * 14 }}
              transition={SPRING}
            >
              <SwipeCard
                item={item}
                onSwipe={isTop ? handleSwipe : () => {}}
                onSave={isTop ? () => onItemSave?.(item) : undefined}
                onOpenDetail={isTop ? () => onItemDetail?.(item) : undefined}
                zIndex={visible.length - depth}
                isTop={isTop}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
