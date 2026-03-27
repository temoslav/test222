'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import type { SwipeItem } from '@/types'

interface Props {
  item: SwipeItem | null
  onClose: () => void
  onSave: (item: SwipeItem) => void
}

function formatPrice(price: number, currency = 'RUB'): string {
  if (currency === 'RUB') return `₽${price.toLocaleString('ru-RU')}`
  return `${price.toLocaleString('en-US')} ${currency}`
}

function formatEventDate(starts_at: string): string {
  const d = new Date(starts_at)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

export default function ItemDetailModal({ item, onClose, onSave }: Props) {
  useEffect(() => {
    if (!item) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [item])

  const isEvent = item?.type === 'event'
  const ctaLabel = isEvent ? 'Купить билет →' : 'Перейти к товару →'

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[99]"
          />
          
          {/* White sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 40 }}
            style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
            className="fixed left-0 right-0 mx-auto w-full max-w-[430px] z-[100] bg-white rounded-t-2xl max-h-[calc(85vh-64px)] overflow-y-auto"
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#EBEBEB' }} />
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1">
              {/* Hero image */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#F7F7F5' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_urls?.[0] || item.imageUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'}
                  alt={item.title}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px 40px' }}>
                {/* Category · City */}
                {(item.category || item.city) && (
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 11,
                    color: '#6B6B6B',
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
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#0F0F0F',
                  margin: '0 0 4px',
                  lineHeight: 1.25,
                }}>
                  {item.title}
                </h2>

                {/* Brand */}
                {item.brand && (
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    color: '#6B6B6B',
                    margin: '0 0 16px',
                  }}>
                    {item.brand}
                  </p>
                )}

                {/* Price */}
                {item.price != null && (
                  <div style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-dm-mono)',
                    fontSize: 22,
                    fontWeight: 500,
                    color: '#0F0F0F',
                    margin: '0 0 16px',
                  }}>
                    {formatPrice(item.price, item.currency)}
                  </div>
                )}

                {/* Event date */}
                {isEvent && item.starts_at && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    background: '#F7F7F5',
                    borderRadius: 12,
                    margin: '0 0 16px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#0F0F0F' }}>
                      {formatEventDate(item.starts_at)}
                    </span>
                  </div>
                )}

                {/* Description */}
                {item.description && (
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 15,
                    color: '#6B6B6B',
                    lineHeight: 1.6,
                    margin: '0 0 28px',
                  }}>
                    {item.description}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {/* Save */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSave(item)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      border: '2px solid #EBEBEB',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </motion.button>

                  {/* CTA */}
                  {item.external_url && (
                    <motion.a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.97 }}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 16,
                        background: '#0F0F0F',
                        color: '#FFFFFF',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 15,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {ctaLabel}
                    </motion.a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
