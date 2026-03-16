'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { saveRole, saveBuyerProfile, createSellerProfileOnboarding } from '@/app/onboarding/actions'

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'fashion',     label: 'Одежда',      icon: '👗' },
  { id: 'sneakers',    label: 'Кроссовки',   icon: '👟' },
  { id: 'beauty',      label: 'Красота',     icon: '💄' },
  { id: 'home',        label: 'Дом',         icon: '🏠' },
  { id: 'events',      label: 'События',     icon: '🎵' },
  { id: 'food',        label: 'Еда',         icon: '🍕' },
  { id: 'electronics', label: 'Электроника', icon: '📱' },
  { id: 'sport',       label: 'Спорт',       icon: '🏋️' },
  { id: 'books',       label: 'Книги',       icon: '📚' },
  { id: 'eco',         label: 'Эко-товары',  icon: '🌿' },
  { id: 'art',         label: 'Искусство',   icon: '🎨' },
  { id: 'travel',      label: 'Путешествия', icon: '✈️' },
]

const SELLER_CATEGORIES = [
  'Одежда и аксессуары', 'Электроника', 'Красота и уход',
  'Дом и интерьер', 'Спорт и отдых', 'Еда и напитки',
  'Искусство и дизайн', 'Детские товары', 'Книги и музыка', 'Другое',
]

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург',
  'Казань', 'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
]

const PRICE_MIN = 500
const PRICE_MAX = 50000

type Step = 'role' | 'interests' | 'price' | 'seller' | 'done'

// ── Helpers ───────────────────────────────────────────────────
function fmtPrice(n: number) {
  return `₽${n.toLocaleString('ru-RU')}`
}

// ── Step indicator ────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === current ? '#FF4D4D' : i < current ? '#0F0F0F' : '#EBEBEB',
            transition: 'all 0.25s',
          }}
        />
      ))}
    </div>
  )
}

// ── Dual Range Slider ─────────────────────────────────────────
function DualRangeSlider({
  min, max, valueMin, valueMax, onChange,
}: {
  min: number; max: number
  valueMin: number; valueMax: number
  onChange: (min: number, max: number) => void
}) {
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  return (
    <div style={{ position: 'relative', height: 40, marginTop: 8 }}>
      {/* Track background */}
      <div style={{
        position: 'absolute',
        top: 18, left: 0, right: 0,
        height: 4, borderRadius: 2, background: '#EBEBEB',
      }} />
      {/* Active range fill */}
      <div style={{
        position: 'absolute',
        top: 18,
        left: `${pct(valueMin)}%`,
        width: `${pct(valueMax) - pct(valueMin)}%`,
        height: 4,
        borderRadius: 2,
        background: '#FF4D4D',
      }} />

      {/* Min thumb */}
      <input
        ref={minRef}
        type="range"
        min={min} max={max} step={500}
        value={valueMin}
        onChange={e => {
          const v = Math.min(Number(e.target.value), valueMax - 500)
          onChange(v, valueMax)
        }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          width: '100%', height: 40, opacity: 0,
          pointerEvents: 'auto', cursor: 'pointer', zIndex: valueMin > max - 500 ? 5 : 3,
        }}
      />

      {/* Max thumb */}
      <input
        ref={maxRef}
        type="range"
        min={min} max={max} step={500}
        value={valueMax}
        onChange={e => {
          const v = Math.max(Number(e.target.value), valueMin + 500)
          onChange(valueMin, v)
        }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          width: '100%', height: 40, opacity: 0,
          pointerEvents: 'auto', cursor: 'pointer', zIndex: 4,
        }}
      />

      {/* Visual thumb min */}
      <div style={{
        position: 'absolute', top: 10,
        left: `calc(${pct(valueMin)}% - 10px)`,
        width: 20, height: 20,
        borderRadius: '50%',
        background: '#FFFFFF',
        border: '3px solid #FF4D4D',
        boxShadow: '0 2px 8px rgba(255,77,77,0.3)',
        pointerEvents: 'none',
      }} />

      {/* Visual thumb max */}
      <div style={{
        position: 'absolute', top: 10,
        left: `calc(${pct(valueMax)}% - 10px)`,
        width: 20, height: 20,
        borderRadius: '50%',
        background: '#FFFFFF',
        border: '3px solid #FF4D4D',
        boxShadow: '0 2px 8px rgba(255,77,77,0.3)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ── Animated checkmark ────────────────────────────────────────
function Checkmark() {
  return (
    <motion.svg
      width="72" height="72" viewBox="0 0 72 72"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <motion.circle
        cx="36" cy="36" r="34"
        fill="none" stroke="#FF4D4D" strokeWidth="4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.polyline
        points="22,36 32,46 52,26"
        fill="none" stroke="#FF4D4D" strokeWidth="4"
        strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      />
    </motion.svg>
  )
}

// ── Main component ────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('role')
  const [role, setRoleState] = useState<'buyer' | 'seller' | null>(null)
  const [interests, setInterests] = useState<Set<string>>(new Set())
  const [priceMin, setPriceMin] = useState(500)
  const [priceMax, setPriceMax] = useState(15000)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSteps = role === 'seller' ? 3 : 4

  const currentDot = step === 'role' ? 0
    : step === 'interests' ? 1
    : step === 'price' ? 2
    : step === 'seller' ? 1
    : totalSteps - 1

  // ── Role selection ────────────────────────────────────────
  async function handleRoleSelect(r: 'buyer' | 'seller') {
    setLoading(true)
    setError(null)
    const res = await saveRole(r)
    setLoading(false)
    if (res?.error) { setError(res.error); return }
    setRoleState(r)
    setStep(r === 'buyer' ? 'interests' : 'seller')
  }

  // ── Buyer: interests → price ──────────────────────────────
  function handleInterestsContinue() {
    if (interests.size < 3) { setError('Выберите хотя бы 3 категории'); return }
    setError(null)
    setStep('price')
  }

  function toggleInterest(id: string) {
    setInterests(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setError(null)
  }

  // ── Buyer: price → done ───────────────────────────────────
  async function handleBuyerFinish() {
    setLoading(true)
    setError(null)
    await saveBuyerProfile(Array.from(interests), priceMin, priceMax)
  }

  // ── Seller: form submit ───────────────────────────────────
  async function handleSellerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const res = await createSellerProfileOnboarding(fd)
    if (res?.error) { setError(res.error); setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F7F7F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <AnimatePresence mode="wait">
        {/* ── Step 1: Role ──────────────────────────────────── */}
        {step === 'role' && (
          <motion.div
            key="role"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <StepDots total={3} current={0} />
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 30,
                fontWeight: 700,
                color: '#0F0F0F',
                margin: '0 0 10px',
                lineHeight: 1.2,
              }}>
                Ты покупатель<br />или продавец?
              </h1>
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15, color: '#6B6B6B', margin: 0 }}>
                Выбери роль — мы настроим лично под тебя
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { r: 'buyer' as const,  icon: '🛍️', title: 'Я покупатель', sub: 'Открывай товары и события' },
                { r: 'seller' as const, icon: '🏪', title: 'Я продавец',   sub: 'Продавай своей аудитории' },
              ].map(({ r, icon, title, sub }) => (
                <motion.button
                  key={r}
                  whileTap={{ scale: 0.97 }}
                  disabled={loading}
                  onClick={() => handleRoleSelect(r)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '20px 24px',
                    background: '#FFFFFF',
                    border: '2px solid #EBEBEB',
                    borderRadius: 20,
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <span style={{ fontSize: 36 }}>{icon}</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-playfair)', fontSize: 18, fontWeight: 700, color: '#0F0F0F', margin: '0 0 2px' }}>
                      {title}
                    </p>
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#6B6B6B', margin: 0 }}>
                      {sub}
                    </p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: '#C0C0C0', fontSize: 18 }}>→</span>
                </motion.button>
              ))}
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF4D4D', textAlign: 'center', marginTop: 16 }}>
                {error}
              </p>
            )}
          </motion.div>
        )}

        {/* ── Step 2: Interests ─────────────────────────────── */}
        {step === 'interests' && (
          <motion.div
            key="interests"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <StepDots total={totalSteps} current={currentDot} />
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 700, color: '#0F0F0F', margin: '0 0 8px' }}>
                Что тебе интересно?
              </h1>
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#6B6B6B', margin: 0 }}>
                Выбери хотя бы 3 — лента подстроится под тебя
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
              {CATEGORIES.map(cat => {
                const active = interests.has(cat.id)
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => toggleInterest(cat.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px',
                      borderRadius: 100,
                      border: `2px solid ${active ? '#FF4D4D' : '#EBEBEB'}`,
                      background: active ? '#FF4D4D' : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#6B6B6B',
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </motion.button>
                )
              })}
            </div>

            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#6B6B6B', textAlign: 'center', marginBottom: 16 }}>
              Выбрано: {interests.size} / 12 {interests.size < 3 ? `(нужно ещё ${3 - interests.size})` : '✓'}
            </p>

            {error && (
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF4D4D', textAlign: 'center', marginBottom: 12 }}>
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleInterestsContinue}
              disabled={interests.size < 3}
              style={{
                width: '100%', height: 52,
                borderRadius: 16,
                border: 'none',
                background: interests.size >= 3 ? '#0F0F0F' : '#EBEBEB',
                color: interests.size >= 3 ? '#FFFFFF' : '#B0B0B0',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 15, fontWeight: 600,
                cursor: interests.size >= 3 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Продолжить →
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 3: Price range ───────────────────────────── */}
        {step === 'price' && (
          <motion.div
            key="price"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <StepDots total={totalSteps} current={currentDot} />
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 700, color: '#0F0F0F', margin: '0 0 8px' }}>
                Какой бюджет<br />на покупки?
              </h1>
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#6B6B6B', margin: 0 }}>
                Лента подберёт товары в твоём бюджете
              </p>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: 24,
              padding: '28px 24px 32px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              marginBottom: 24,
            }}>
              {/* Price labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#6B6B6B', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    от
                  </p>
                  <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 22, fontWeight: 500, color: '#0F0F0F', margin: 0 }}>
                    {fmtPrice(priceMin)}
                  </p>
                </div>
                <div style={{ width: 1, background: '#EBEBEB', height: 48 }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#6B6B6B', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    до
                  </p>
                  <p style={{ fontFamily: 'var(--font-dm-mono)', fontSize: 22, fontWeight: 500, color: '#0F0F0F', margin: 0 }}>
                    {fmtPrice(priceMax)}
                  </p>
                </div>
              </div>

              <DualRangeSlider
                min={PRICE_MIN} max={PRICE_MAX}
                valueMin={priceMin} valueMax={priceMax}
                onChange={(mn, mx) => { setPriceMin(mn); setPriceMax(mx) }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C0C0C0' }}>{fmtPrice(PRICE_MIN)}</span>
                <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C0C0C0' }}>{fmtPrice(PRICE_MAX)}</span>
              </div>
            </div>

            {error && (
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF4D4D', textAlign: 'center', marginBottom: 12 }}>
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBuyerFinish}
              disabled={loading}
              style={{
                width: '100%', height: 52,
                borderRadius: 16, border: 'none',
                background: '#FF4D4D',
                color: '#FFFFFF',
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Сохраняем...' : 'Начать открывать →'}
            </motion.button>
          </motion.div>
        )}

        {/* ── Step 4 (seller): Business setup ──────────────── */}
        {step === 'seller' && (
          <motion.div
            key="seller"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            style={{ width: '100%', maxWidth: 420 }}
          >
            <StepDots total={totalSteps} current={currentDot} />
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontFamily: 'var(--font-playfair)', fontSize: 28, fontWeight: 700, color: '#0F0F0F', margin: '0 0 8px' }}>
                Создай профиль продавца
              </h1>
              <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: '#6B6B6B', margin: 0 }}>
                После заполнения выберешь тариф и начнёшь добавлять товары
              </p>
            </div>

            <form
              onSubmit={handleSellerSubmit}
              style={{ background: '#FFFFFF', borderRadius: 24, padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#0F0F0F', marginBottom: 6 }}>
                  Название бизнеса <span style={{ color: '#FF4D4D' }}>*</span>
                </label>
                <input
                  name="business_name" type="text" required maxLength={100}
                  placeholder="Например: Studio Loom"
                  className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] placeholder:text-[#C4C4C4] focus:outline-none focus:border-[#0F0F0F] transition-all"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#0F0F0F', marginBottom: 6 }}>
                  Описание <span style={{ fontWeight: 400, color: '#6B6B6B' }}>(до 200 символов)</span>
                </label>
                <textarea
                  name="description" maxLength={200} rows={3}
                  placeholder="Расскажи о своём бизнесе (необязательно)"
                  className="w-full px-4 py-3 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] placeholder:text-[#C4C4C4] focus:outline-none focus:border-[#0F0F0F] transition-all resize-none"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#0F0F0F', marginBottom: 6 }}>
                  Город <span style={{ color: '#FF4D4D' }}>*</span>
                </label>
                <select
                  name="city" required defaultValue=""
                  className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] bg-white focus:outline-none focus:border-[#0F0F0F] transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Выберите город</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#0F0F0F', marginBottom: 6 }}>
                  Категория <span style={{ color: '#FF4D4D' }}>*</span>
                </label>
                <select
                  name="category" required defaultValue=""
                  className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] bg-white focus:outline-none focus:border-[#0F0F0F] transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Выберите категорию</option>
                  {SELLER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: '#FF4D4D', textAlign: 'center' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', height: 52,
                  borderRadius: 16, border: 'none',
                  background: '#0F0F0F',
                  color: '#FFFFFF',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 15, fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {loading ? 'Создаём профиль...' : 'Создать профиль продавца →'}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── Step 5: Done ──────────────────────────────────── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ width: '100%', maxWidth: 420, textAlign: 'center', padding: '48px 24px' }}
          >
            <Checkmark />
            <h1 style={{
              fontFamily: 'var(--font-playfair)',
              fontSize: 28, fontWeight: 700,
              color: '#0F0F0F',
              margin: '28px 0 10px',
            }}>
              Всё готово! Добро пожаловать в Swipely
            </h1>
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 15, color: '#6B6B6B', marginBottom: 36 }}>
              Лента уже ждёт тебя
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
