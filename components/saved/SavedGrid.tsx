'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SavedItemCard {
  id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  category: string | null
  brand: string | null
  city: string | null
  imageUrl: string
  external_url: string | null
}

function formatPrice(price: number, currency: string) {
  if (currency === 'RUB') return `₽${price.toLocaleString('ru-RU')}`
  return `${price.toLocaleString('en-US')} ${currency}`
}

// Alternate card heights for masonry effect: odd indices taller
const CARD_HEIGHTS = ['220px', '280px', '240px', '300px', '220px', '260px', '300px', '240px']

export default function SavedGrid({ items }: { items: SavedItemCard[] }) {
  const [selected, setSelected] = useState<SavedItemCard | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ fontSize: 64, marginBottom: 20 }}>🤍</div>
          <h2 style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 24,
            fontWeight: 700,
            color: '#0F0F0F',
            margin: '0 0 10px',
          }}>
            Пока пусто
          </h2>
          <p style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 15,
            color: '#6B6B6B',
            lineHeight: 1.6,
            maxWidth: 240,
            margin: '0 auto',
          }}>
            Свайпайте карточки и нажимайте закладку чтобы сохранять понравившееся
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div style={{ padding: '24px 16px 16px' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 26, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px' }}>
          Сохранённые
        </h1>
        <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#6B6B6B', margin: 0 }}>
          {items.length} {items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}
        </p>
      </div>

      {/* Masonry grid via CSS columns */}
      <div style={{
        padding: '0 12px 24px',
        columns: 2,
        columnGap: 10,
      }}>
        {items.map((item, i) => {
          const imgH = CARD_HEIGHTS[i % CARD_HEIGHTS.length]
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              onClick={() => setSelected(item)}
              style={{
                display: 'block',
                width: '100%',
                breakInside: 'avoid',
                marginBottom: 10,
                borderRadius: 16,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer',
                border: 'none',
                padding: 0,
                background: '#1a1a1a',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              }}
            >
              {/* Image */}
              <div style={{ position: 'relative', width: '100%', height: imgH, overflow: 'hidden' }}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: '#F7F7F5' }}>
                    🛍
                  </div>
                )}

                {/* Gradient overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)',
                  pointerEvents: 'none',
                }} />

                {/* Text over gradient */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '12px 12px 14px',
                  textAlign: 'left',
                }}>
                  {item.category && (
                    <p style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.60)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      margin: '0 0 4px',
                    }}>
                      {item.category}
                    </p>
                  )}
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    margin: 0,
                    lineHeight: 1.3,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {item.title}
                  </p>
                  {item.price != null && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: 6,
                      fontFamily: 'var(--font-dm-mono)',
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#0F0F0F',
                      background: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: 100,
                    }}>
                      {formatPrice(item.price, item.currency)}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Detail bottom sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200 }}
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 40 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: 430,
                background: '#FFFFFF',
                borderRadius: '24px 24px 0 0',
                zIndex: 201,
                maxHeight: '90dvh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#EBEBEB' }} />
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {selected.imageUrl && (
                  <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden', background: '#F7F7F5' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img loading="lazy" src={selected.imageUrl} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}

                <div style={{ padding: '20px 24px 32px' }}>
                  {(selected.category || selected.city) && (
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#6B6B6B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                      {[selected.category, selected.city].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: 22, fontWeight: 700, color: '#0F0F0F', margin: '0 0 4px', lineHeight: 1.25 }}>
                    {selected.title}
                  </h2>
                  {selected.brand && (
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#6B6B6B', margin: '0 0 16px' }}>
                      {selected.brand}
                    </p>
                  )}
                  {selected.price != null && (
                    <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 22, fontWeight: 500, color: '#0F0F0F', margin: '0 0 16px' }}>
                      {formatPrice(selected.price, selected.currency)}
                    </p>
                  )}
                  {selected.description && (
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#6B6B6B', lineHeight: 1.65, margin: '0 0 24px' }}>
                      {selected.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      style={{
                        flex: 1,
                        height: 52,
                        borderRadius: 16,
                        border: '2px solid #EBEBEB',
                        background: '#FFFFFF',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#6B6B6B',
                        cursor: 'pointer',
                      }}
                    >
                      Закрыть
                    </button>
                    {selected.external_url && (
                      <a
                        href={selected.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 2,
                          height: 52,
                          borderRadius: 16,
                          background: '#0F0F0F',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 14,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                      >
                        Открыть сайт →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
