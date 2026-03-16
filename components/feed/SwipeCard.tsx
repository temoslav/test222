'use client'

import { useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  type PanInfo,
} from 'framer-motion'
import type { SwipeItem, SwipeDirection } from '@/types'

const SWIPE_THRESHOLD = 80
const SPRING = { type: 'spring', stiffness: 300, damping: 30 } as const

function formatPrice(price: number, currency = 'RUB'): string {
  if (currency === 'RUB') return `₽${price.toLocaleString('ru-RU')}`
  return `${price.toLocaleString('en-US')} ${currency}`
}

interface SwipeCardProps {
  item: SwipeItem
  onSwipe: (direction: SwipeDirection) => void
  onSave?: () => void
  onOpenDetail?: () => void
  zIndex?: number
  isTop?: boolean
}

export default function SwipeCard({
  item,
  onSwipe,
  onSave,
  onOpenDetail,
  zIndex = 1,
  isTop = true,
}: SwipeCardProps) {

  const [isDragging, setIsDragging] = useState(false)
  const controls = useAnimation()
  const x        = useMotionValue(0)
  const rotate   = useTransform(x, [-250, 250], [-12, 12])

  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleDragStart = () => setIsDragging(true)

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    setIsDragging(false)
    const shouldRight = info.offset.x > SWIPE_THRESHOLD  || info.velocity.x >  500
    const shouldLeft  = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500

    if (shouldRight) {
      await controls.start({ x: window.innerWidth + 300, rotate: 20, opacity: 0, transition: { ...SPRING, duration: 0.3 } })
      onSwipe('right')
    } else if (shouldLeft) {
      await controls.start({ x: -(window.innerWidth + 300), rotate: -20, opacity: 0, transition: { ...SPRING, duration: 0.3 } })
      onSwipe('left')
    } else {
      controls.start({ x: 0, rotate: 0, opacity: 1, transition: SPRING })
    }
  }

  return (
    <motion.div
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTap={() => { if (!isDragging) onOpenDetail?.() }}
      animate={controls}
      style={{
        x,
        rotate,
        zIndex,
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      {/* Full-bleed photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image_urls?.[0] || item.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'}
        alt={item.title}
        loading="lazy"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
        }}
      />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 38%, transparent 62%)',
        pointerEvents: 'none',
      }} />

      {/* НРАВИТСЯ hint (right drag) — top-left stamp */}
      <motion.div
        style={{
          position: 'absolute',
          top: 28,
          left: 20,
          opacity: likeOpacity,
          border: '3px solid #4CAF50',
          borderRadius: 8,
          padding: '3px 14px',
          pointerEvents: 'none',
          rotate: '-12deg',
        }}
      >
        <span style={{ color: '#4CAF50', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 22, letterSpacing: 3 }}>
          НРАВИТСЯ
        </span>
      </motion.div>

      {/* НЕ МОЁ hint (left drag) — top-right stamp */}
      <motion.div
        style={{
          position: 'absolute',
          top: 28,
          right: 72,
          opacity: nopeOpacity,
          border: '3px solid #FF4D4D',
          borderRadius: 8,
          padding: '3px 14px',
          pointerEvents: 'none',
          rotate: '12deg',
        }}
      >
        <span style={{ color: '#FF4D4D', fontFamily: 'var(--font-dm-sans)', fontWeight: 700, fontSize: 22, letterSpacing: 3 }}>
          НЕ МОЁ
        </span>
      </motion.div>

      {/* Bookmark button — top-right */}
      <motion.button
        aria-label="Сохранить"
        onPointerDown={(e) => e.stopPropagation()}
        onTap={(e) => { e.stopPropagation(); onSave?.() }}
        whileTap={{ scale: 0.85 }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
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
          zIndex: 10,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </motion.button>

      {/* Text zone — over gradient, bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0 24px 36px',
        pointerEvents: 'none',
      }}>
        {/* Category · City */}
        {(item.category || item.city) && (
          <p style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.70)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}>
            {[item.category, item.city].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 26,
          fontWeight: 700,
          color: '#FFFFFF',
          margin: '0 0 12px',
          lineHeight: 1.2,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {item.title}
        </h2>

        {/* Brand + Price */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {item.brand && (
            <span style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 13,
              color: 'rgba(255,255,255,0.75)',
            }}>
              {item.brand}
            </span>
          )}
          {(() => {
            const price = typeof item.price === 'string' ? parseInt(item.price) : item.price
            return price != null && price > 0 && (
              <span style={{
                fontFamily: 'var(--font-dm-mono)',
                fontSize: 14,
                fontWeight: 500,
                color: 'white',
                background: '#FF4D4D',
                padding: '5px 14px',
                borderRadius: 100,
                marginLeft: 'auto',
              }}>
                {formatPrice(price, item.currency)}
              </span>
            )
          })()}
        </div>
      </div>
    </motion.div>
  )
}
