'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { SwipeItem } from '@/types'

interface Props {
  item: SwipeItem | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: () => void
  onRemoveFromWishlist?: () => void
}

export default function ItemDetailSheet({ 
  item, 
  isOpen, 
  onClose, 
  onAddToCart,
  onRemoveFromWishlist 
}: Props) {
  if (!item) return null

  const handleAddToCart = async () => {
    console.log('Adding to cart:', item.id)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, quantity: 1 }),
      })
      
      console.log('Cart response status:', response.status)
      const data = await response.json()
      console.log('Cart response data:', data)
      
      if (response.ok) {
        onAddToCart()
      } else {
        console.error('Cart API error:', data)
      }
    } catch (error) {
      console.error('Cart error:', error)
    }
  }

  const handleRemoveFromWishlist = async () => {
    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id }),
      })
      
      if (response.ok) {
        onRemoveFromWishlist?.()
        onClose()
      }
    } catch (error) {
      console.error('Wishlist error:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: '64px', // Leave space for bottom nav
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 42 }}
            style={{
              width: '100%',
              maxWidth: '430px',
              maxHeight: 'calc(100vh - 64px)',
              height: 'auto',
              borderRadius: '24px 24px 0 0',
              background: 'white',
              zIndex: 100,
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
              {/* Handle */}
              <div style={{
                width: 40,
                height: 4,
                background: '#EBEBEB',
                borderRadius: 2,
                margin: '0 auto 20px'
              }} />

              {/* Images */}
              {item.image_urls && item.image_urls.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '20px',
                  overflowX: 'auto'
                }}>
                  {item.image_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${item.title} ${index + 1}`}
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Title */}
              <h2 style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 24,
                fontWeight: 700,
                color: '#0F0F0F',
                margin: '0 0 12px',
                lineHeight: 1.3
              }}>
                {item.title}
              </h2>

              {/* Price */}
              {item.price && (
                <p style={{
                  fontFamily: 'var(--font-dm-mono)',
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#FF4D4D',
                  margin: '0 0 16px'
                }}>
                  ₽{item.price.toLocaleString()}
                </p>
              )}

              {/* Category */}
              {item.category && (
                <div style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: '#F5F5F5',
                  borderRadius: '20px',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#6B6B6B'
                  }}>
                    {item.category}
                  </span>
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div style={{
                  marginBottom: '32px'
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#0F0F0F',
                    margin: '0 0 12px'
                  }}>
                    Описание
                  </h3>
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    color: '#6B6B6B',
                    lineHeight: 1.6,
                    margin: 0
                  }}>
                    {item.description}
                  </p>
                </div>
              )}

              {/* Location */}
              {item.city && (
                <div style={{
                  marginBottom: '32px'
                }}>
                  <h3 style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#0F0F0F',
                    margin: '0 0 8px'
                  }}>
                    Место
                  </h3>
                  <p style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    color: '#6B6B6B',
                    margin: 0
                  }}>
                    📍 {item.city}
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{
              position: 'sticky',
              bottom: 0,
              background: '#FFFFFF',
              padding: '12px 20px 16px',
              borderTop: '1px solid #EBEBEB',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleRemoveFromWishlist}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: '2px solid #E5E5E5',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  color: '#6B6B6B',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FF4D4D'
                  e.currentTarget.style.color = '#FF4D4D'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E5E5'
                  e.currentTarget.style.color = '#6B6B6B'
                }}
              >
                Убрать
              </button>
              
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 2,
                  padding: '16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: '#0F0F0F',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                В корзину
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
