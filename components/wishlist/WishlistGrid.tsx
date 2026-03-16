'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { SwipeItem } from '@/types'
import ItemDetailSheet from '@/components/wishlist/ItemDetailSheet'
import CartSheet from '@/components/cart/CartSheet'

interface Props {
  items: SwipeItem[]
}

export default function WishlistGrid({ items }: Props) {
  const [selectedItem, setSelectedItem] = useState<SwipeItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)

  if (!items.length) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          fontSize: 80, 
          marginBottom: 24,
          opacity: 0.3
        }}>
          ❤️
        </div>
        <h2 style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 24,
          fontWeight: 700,
          color: '#0F0F0F',
          margin: '0 0 12px',
          lineHeight: 1.3
        }}>
          Свайпай вправо — и товары появятся здесь
        </h2>
        <p style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 16,
          color: '#6B6B6B',
          margin: '0 0 32px',
          lineHeight: 1.5
        }}>
          Сохраняйте понравившиеся товары одним движением
        </p>
        <Link
          href="/feed"
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: '#FF4D4D',
            color: '#FFFFFF',
            borderRadius: 100,
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          Перейти в ленту
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 style={{
        fontFamily: 'var(--font-playfair)',
        fontSize: 32,
        fontWeight: 700,
        color: '#0F0F0F',
        margin: '0 0 32px',
        textAlign: 'center'
      }}>
        Хочу
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '100px'
      }}>
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{ borderRadius: 16 }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedItem(item)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Image */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: '133.33%', // 3:4 aspect ratio
                  background: '#F5F5F5',
                  overflow: 'hidden'
                }}>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>

                {/* Content */}
                <div style={{ padding: '12px' }}>
                  <h3 style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#0F0F0F',
                    margin: '0 0 8px',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {item.title}
                  </h3>
                  
                  {item.price && (
                    <p style={{
                      fontFamily: 'var(--font-dm-mono)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#FF4D4D',
                      margin: 0
                    }}>
                      ₽{item.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cart floating button (only visible when cart has items) */}
      <motion.div
        onClick={() => setCartOpen(true)}
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#0F0F0F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 40,
          transition: 'transform 0.2s'
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </motion.div>

      {/* Item detail sheet */}
      <ItemDetailSheet
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onAddToCart={() => {
          setSelectedItem(null)
          setCartOpen(true)
        }}
      />

      {/* Cart sheet */}
      <CartSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </>
  )
}
