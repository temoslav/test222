'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SwipeItem } from '@/types'

interface CartItem extends SwipeItem {
  quantity: number
  cart_id: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function CartSheet({ isOpen, onClose }: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // Fetch cart data when sheet opens
  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cart')
      if (response.ok) {
        const data = await response.json()
        const items = data.data?.map((item: any) => ({
          ...item.items,
          quantity: item.quantity,
          cart_id: item.id
        })) || []
        setCartItems(items)
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Cart fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update quantity
  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, quantity }),
      })
      
      if (response.ok) {
        fetchCart() // Refresh cart
      }
    } catch (error) {
      console.error('Update quantity error:', error)
    }
  }

  // Handle quantity change with remove functionality
  const handleQuantityChange = async (itemId: string, currentQty: number) => {
    if (currentQty <= 1) {
      // Remove item completely
      await removeItem(itemId)
    } else {
      // Decrease quantity
      await updateQuantity(itemId, currentQty - 1)
    }
  }

  // Remove item
  const removeItem = async (itemId: string) => {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
      
      if (response.ok) {
        fetchCart() // Refresh cart
      }
    } catch (error) {
      console.error('Remove item error:', error)
    }
  }

  // Handle checkout
  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cartItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
  }

  // Fetch cart when sheet opens
  React.useEffect(() => {
    if (isOpen) {
      fetchCart()
    }
  }, [isOpen])

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
              background: '#FFFFFF',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #EBEBEB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 20,
                fontWeight: 700,
                color: '#0F0F0F',
                margin: 0
              }}>
                Корзина
              </h2>
              
              <button
                onClick={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Cart items */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div>Загрузка...</div>
                </div>
              ) : cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🛒</div>
                  <p style={{ fontFamily: 'var(--font-dm-sans)', color: '#6B6B6B' }}>
                    Корзина пуста
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {cartItems.map((item) => (
                    <motion.div
                      key={item.cart_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        background: '#F9F9F9',
                        borderRadius: '12px'
                      }}
                    >
                      {/* Image */}
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '12px',
                          objectFit: 'cover'
                        }}
                      />

                      {/* Details */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#0F0F0F',
                          margin: '0 0 4px',
                          lineHeight: 1.3
                        }}>
                          {item.title}
                        </h4>
                        
                        {item.category && (
                          <p style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: 12,
                            color: '#6B6B6B',
                            margin: '0 0 8px'
                          }}>
                            {item.category}
                          </p>
                        )}

                        <p style={{
                          fontFamily: 'var(--font-dm-mono)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#FF4D4D',
                          margin: '0 0 8px'
                        }}>
                          ₽{item.price?.toLocaleString()}
                        </p>

                        {/* Quantity controls */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '1px solid #E5E5E5',
                              background: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: 16
                            }}
                          >
                            −
                          </button>
                          
                          <span style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: 14,
                            fontWeight: 500,
                            minWidth: 20,
                            textAlign: 'center'
                          }}>
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '1px solid #E5E5E5',
                              background: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: 16
                            }}
                          >
                            +
                          </button>

                          <button
                            onClick={() => removeItem(item.id)}
                            style={{
                              marginLeft: 'auto',
                              padding: '4px 8px',
                              border: 'none',
                              background: 'none',
                              color: '#FF4D4D',
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom */}
            {cartItems.length > 0 && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                background: '#FFFFFF',
                padding: '12px 20px 16px',
                borderTop: '1px solid #EBEBEB'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 16,
                    color: '#6B6B6B'
                  }}>
                    Итого:
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-mono)',
                    fontSize: 20,
                    fontWeight: 600,
                    color: '#0F0F0F'
                  }}>
                    ₽{total.toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleCheckout}
                  style={{
                    width: '100%',
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
                  Оформить заказ →
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
