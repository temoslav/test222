'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'

const CATEGORIES = [
  '👗 Одежда', '👟 Кроссовки', '💄 Красота', '🏠 Дом',
  '🎵 События', '🍕 Еда', '📱 Электроника', '🏋️ Спорт',
  '📚 Книги', '🌿 Эко', '🎨 Искусство', '✈️ Путешествия'
]

export function TasteEditModal({ 
  isOpen, 
  onClose, 
  initialInterests,
  initialPriceMin,
  initialPriceMax,
  onSave 
}: {
  isOpen: boolean
  onClose: () => void
  initialInterests: string[]
  initialPriceMin?: number
  initialPriceMax?: number
  onSave: (interests: string[], priceMin: number, priceMax: number) => void
}) {
  const [selected, setSelected] = useState<string[]>(initialInterests)
  const [priceMin, setPriceMin] = useState(initialPriceMin ?? 0)
  const [priceMax, setPriceMax] = useState(initialPriceMax ?? 500000)

  if (!isOpen) return null

  const toggle = (cat: string) => {
    setSelected(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handlePriceMinChange = (value: number) => {
    const newValue = Math.min(value, priceMax - 1000)
    setPriceMin(newValue)
  }

  const handlePriceMaxChange = (value: number) => {
    const newValue = Math.max(value, priceMin + 1000)
    setPriceMax(newValue)
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: 430,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 4, background: '#E0E0E0',
            borderRadius: 2, margin: '0 auto 16px',
          }} />
          <h2 style={{ 
            fontFamily: 'Playfair Display', 
            fontSize: 20, margin: 0, marginBottom: 4 
          }}>
            Редактировать вкус
          </h2>
          <p style={{ 
            fontSize: 13, color: '#6B6B6B', margin: '0 0 16px' 
          }}>
            Выбери хотя бы 3 категории
          </p>
        </div>

        {/* Scrollable content */}
        <div style={{ 
          overflowY: 'auto', 
          padding: '0 20px', 
          flex: 1 
        }}>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 8,
            paddingBottom: 16,
          }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => toggle(cat)} style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: selected.includes(cat) 
                  ? 'none' : '1px solid #EBEBEB',
                background: selected.includes(cat) 
                  ? '#FF4D4D' : 'white',
                color: selected.includes(cat) ? 'white' : '#0F0F0F',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'DM Sans',
              }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Budget slider */}
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 13, fontWeight: 600, 
              marginBottom: 12, fontFamily: 'DM Sans' }}>
              БЮДЖЕТ
            </p>
            <div style={{ display: 'flex', 
              justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#6B6B6B' }}>
                ₽{priceMin.toLocaleString('ru-RU')}
              </span>
              <span style={{ fontSize: 13, color: '#6B6B6B' }}>
                ₽{priceMax.toLocaleString('ru-RU')}
              </span>
            </div>
            <input 
              type="range" 
              min={0} 
              max={500000} 
              step={1000}
              value={priceMin}
              onChange={e => handlePriceMinChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF4D4D', marginBottom: 8 }}
            />
            <input 
              type="range" 
              min={0} 
              max={500000} 
              step={1000}
              value={priceMax}
              onChange={e => handlePriceMaxChange(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF4D4D' }}
            />
          </div>
        </div>

        {/* Sticky footer buttons */}
        <div style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          borderTop: '1px solid #EBEBEB',
          display: 'flex',
          gap: 8,
          flexShrink: 0,
          background: 'white',
        }}>
          <button onClick={onClose} style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            border: '1px solid #EBEBEB',
            background: 'white',
            color: '#6B6B6B',
            fontSize: 15,
            cursor: 'pointer',
            fontFamily: 'DM Sans',
          }}>
            Отмена
          </button>
          <button 
            onClick={() => { onSave(selected, priceMin, priceMax); onClose() }}
            disabled={selected.length < 3}
            style={{
              flex: 2,
              height: 48,
              borderRadius: 12,
              border: 'none',
              background: selected.length < 3 ? '#E0E0E0' : '#0F0F0F',
              color: 'white',
              fontSize: 15,
              cursor: selected.length < 3 ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans',
            }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
