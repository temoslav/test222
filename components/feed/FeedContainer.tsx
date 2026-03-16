'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CardStack from '@/components/feed/CardStack'
import ItemDetailModal from '@/components/feed/ItemDetailModal'
import type { SwipeItem, SwipeDirection } from '@/types'

interface Props {
  initialItems: SwipeItem[]
}

const ALL_CATEGORIES = ['Одежда', 'Электроника', 'Еда', 'Красота', 'Спорт', 'Концерты', 'Выставки', 'Места', 'Книги', 'Дом']

async function addToWishlist(item_id: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id }),
      })
      if (response.ok) return await response.json()
      if (response.status === 409) return { success: true } // already in wishlist, ok
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    }
  }
  return { error: true }
}

async function logInteraction(item_id: string, action: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id, action, swipe_speed: 'medium', dwell_time_ms: 1500 }),
      })
      if (response.ok) return
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    } catch (e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    }
  }
}

export default function FeedContainer({ initialItems }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [remaining, setRemaining] = useState(initialItems.length)
  const [detailItem, setDetailItem] = useState<SwipeItem | null>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [items, setItems] = useState<SwipeItem[]>(initialItems)
  const [hearts, setHearts] = useState<{id: string, x: number, y: number}[]>([])

  const handleItemSwiped = async (item: SwipeItem, direction: SwipeDirection) => {
    const action = direction === 'right' ? 'swipe_right' : 'swipe_left'
    logInteraction(item.id, action)
    
    // Add to wishlist on right swipe
    if (direction === 'right') {
      const result = await addToWishlist(item.id)
      
      if (result.error) {
        // Could be network error or auth error - show login toast
        alert('Войдите чтобы сохранять')
      } else if (result.success) {
        // Show heart animation
        const rect = document.getElementById(`card-${item.id}`)?.getBoundingClientRect()
        if (rect) {
          const newHeart = {
            id: `${item.id}-${Date.now()}`,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          }
          setHearts(prev => [...prev, newHeart])
          setTimeout(() => {
            setHearts(prev => prev.filter(h => h.id !== newHeart.id))
          }, 1000)
        }
      }
    }
    
    setCurrentIndex(i => i + 1)
    setRemaining(r => Math.max(0, r - 1))
  }

  const handleSave = (item: SwipeItem) => {
    logInteraction(item.id, 'save')
  }

  const handleOpenDetail = (item: SwipeItem) => {
    logInteraction(item.id, 'view_detail')
    setDetailItem(item)
  }

  const toggleCategory = (cat: string) => {
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  return (
    <>
      {/* Full-screen feed area */}
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
        <CardStack
          initialItems={items}
          onItemSwiped={handleItemSwiped}
          onItemSave={handleSave}
          onItemDetail={handleOpenDetail}
          currentIndex={currentIndex}
        />

        {/* Counter — top-left */}
        {remaining > 0 && (
          <div style={{
            position: 'absolute',
            top: 22,
            left: 20,
            zIndex: 50,
            background: 'rgba(0,0,0,0.40)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 100,
            padding: '5px 12px',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.02em',
            }}>
              {remaining} в очереди
            </span>
          </div>
        )}

        {/* Filter button — top-right, hidden when empty */}
        {remaining > 0 && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowFilter(true)}
          style={{
            position: 'absolute',
            top: 20,
            right: 76,
            zIndex: 50,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {activeCategories.length > 0 && (
            <div style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FF4D4D',
            }} />
          )}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
        </motion.button>
        )}
      </div>

      {/* Filter bottom sheet */}
      <AnimatePresence>
        {showFilter && (
          <>
            <motion.div
              key="filter-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
            />
            <motion.div
              key="filter-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 42 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                width: '100%',
                background: '#FFFFFF',
                borderRadius: '24px 24px 0 0',
                zIndex: 301,
                padding: '12px 24px 48px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#EBEBEB' }} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-playfair)', fontSize: 20, fontWeight: 700, color: '#0F0F0F', margin: '0 0 20px' }}>
                Фильтры
              </h3>

              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                Категории
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                {ALL_CATEGORIES.map(cat => {
                  const active = activeCategories.includes(cat)
                  return (
                    <motion.button
                      key={cat}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 100,
                        border: `2px solid ${active ? '#0F0F0F' : '#EBEBEB'}`,
                        background: active ? '#0F0F0F' : '#FFFFFF',
                        color: active ? '#FFFFFF' : '#0F0F0F',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {cat}
                    </motion.button>
                  )
                })}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowFilter(false)}
                style={{
                  width: '100%',
                  height: 52,
                  borderRadius: 16,
                  background: '#0F0F0F',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Применить
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Item detail modal */}
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onSave={(item) => {
          handleSave(item)
          setDetailItem(null)
        }}
      />

      {/* Heart animations */}
      <AnimatePresence>
        {hearts.map(heart => (
          <motion.div
            key={heart.id}
            initial={{ 
              scale: 0, 
              x: heart.x - 20, 
              y: heart.y - 20,
              opacity: 1 
            }}
            animate={{ 
              scale: [0, 1.2, 0.8],
              x: heart.x - 20,
              y: heart.y - 100,
              opacity: 0 
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1,
              ease: "easeOut"
            }}
            style={{
              position: 'fixed',
              fontSize: 40,
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  )
}
