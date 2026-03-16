'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { updateProfile, updateTasteProfile, updateAvatarUrl, deleteAccount } from '@/app/profile/actions'
import { logout } from '@/app/auth/actions'
import { STRIPE_PLANS } from '@/lib/plans'
import { TasteEditModal } from './TasteEditModal'
import CartSheet from '@/components/cart/CartSheet'
import type { Profile, Seller, SubscriptionTier } from '@/types'

const CATEGORIES = [
  '👗 Одежда', '� Кроссовки', '💄 Красота', '🏠 Дом',
  '🎵 События', '� Еда', '📱 Электроника', '🏋️ Спорт',
  '📚 Книги', '🌿 Эко', '� Искусство', '✈️ Путешествия'
]

interface Props {
  profile: Profile
  seller: Seller | null
  monthStats: { views: number; likes: number; clicks: number }
}

const PRICE_MIN = 0
const PRICE_MAX = 500000

function fmtPrice(n: number) {
  return `₽${n.toLocaleString('ru-RU')}`
}

export default function ProfileEditor({ profile, seller, monthStats }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [city, setCity] = useState(profile.city ?? '')
  const [interests, setInterests] = useState<string[]>(profile.interests ?? [])
  const [priceMin, setPriceMin] = useState(profile.price_min ?? 0)
  const [priceMax, setPriceMax] = useState(profile.price_max ?? 500000)
  const [showTasteEdit, setShowTasteEdit] = useState(false)
  const [editInterests, setEditInterests] = useState<string[]>(profile.interests ?? [])
  const [editPriceMin, setEditPriceMin] = useState(profile.price_min ?? 0)
  const [editPriceMax, setEditPriceMax] = useState(profile.price_max ?? 500000)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setMsg({ type: 'err', text: 'Не удалось загрузить фото.' }); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(publicUrl)
    await updateAvatarUrl(publicUrl)
    setUploading(false)
    setMsg({ type: 'ok', text: 'Фото обновлено!' })
  }

  async function handleSaveProfile() {
    setSaving(true)
    setMsg(null)
    const fd = new FormData()
    fd.set('display_name', displayName)
    fd.set('city', city)
    const result = await updateProfile(fd)
    setSaving(false)
    setMsg(result?.error ? { type: 'err', text: result.error } : { type: 'ok', text: 'Сохранено!' })
  }

  async function handleSaveTasteProfile() {
    setSaving(true)
    const result = await updateTasteProfile(editInterests, editPriceMin, editPriceMax)
    setSaving(false)
    if (!result?.error) {
      setInterests(editInterests)
      setPriceMin(editPriceMin)
      setPriceMax(editPriceMax)
      setShowTasteEdit(false)
      setMsg({ type: 'ok', text: 'Лента обновлена под твои интересы' })
      setTimeout(() => setMsg(null), 3000)
    } else {
      setMsg({ type: 'err', text: result.error })
    }
  }

  function toggleEditInterest(id: string) {
    setEditInterests(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const planKey = seller?.subscription_tier as SubscriptionTier | null
  const plan = planKey ? STRIPE_PLANS[planKey] : null

  const cardClass = 'bg-white rounded-2xl p-5 mb-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
  const inputClass = 'w-full h-12 px-3 rounded-[10px] border border-[#EBEBEB] font-sans text-[15px] text-[#0F0F0F] placeholder:text-[#A8A8A8] focus:outline-none focus:border-[#0F0F0F]'

  return (
    <div className="px-4 py-4 pb-24">
      <div className={cardClass}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative shrink-0"
            disabled={uploading}
          >
            <div className="w-20 h-20 rounded-full bg-[#EDEDED] overflow-hidden border border-[#DCDCDC]">
              {avatarUrl ? (
                <img loading="lazy" src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  {profile.role === 'seller' ? '🏪' : '👤'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#0F0F0F] rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-white text-[11px]">✎</span>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          <div className="flex-1 min-w-0">
            <p className="font-sans text-[18px] font-bold text-[#0F0F0F] truncate">
              {profile.display_name || profile.email.split('@')[0]}
            </p>
            <p className="font-sans text-[14px] text-[#6B6B6B] truncate">{profile.email}</p>
            <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
              profile.role === 'seller'
                ? 'bg-[#0F0F0F] text-white'
                : 'bg-[#F0F0F0] text-[#4B4B4B]'
            }`}>
              {profile.role === 'seller' ? '🏪 Продавец' : '�️ Покупатель'}
            </span>
          </div>
        </div>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h2 className="font-sans text-[13px] font-bold text-[#0F0F0F] uppercase tracking-wider">
          Личные данные
        </h2>
        <div>
          <label className="block font-sans text-[12px] font-medium text-[#6B6B6B] mb-2">Имя</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Как вас зовут?"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block font-sans text-[12px] font-medium text-[#6B6B6B] mb-2">Город</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Где вы находитесь?"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block font-sans text-[12px] font-medium text-[#6B6B6B] mb-2">E-mail</label>
          <input
            value={profile.email}
            disabled
            className="w-full h-12 px-3 rounded-[10px] border border-[#EBEBEB] font-sans text-[15px] text-[#A8A8A8] bg-[#FAFAFA]"
          />
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="w-full h-12 bg-[#0F0F0F] text-white rounded-xl font-sans font-semibold text-[15px] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {profile.role === 'buyer' ? (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-sans text-[13px] font-bold text-[#0F0F0F] uppercase tracking-wider">
              Мои интересы
            </h2>
            <button
              type="button"
              onClick={() => { setEditInterests(interests); setEditPriceMin(priceMin); setEditPriceMax(priceMax); setShowTasteEdit(true) }}
              className="h-9 px-4 rounded-xl border border-[#EBEBEB] bg-white text-[#6B6B6B] font-sans text-[13px] font-medium"
            >
              Редактировать вкус
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {interests.length > 0 ? (
              interests.map(interest => (
                <span
                  key={interest}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: '#FF4D4D',
                    color: 'white',
                    fontSize: 13,
                    fontFamily: 'DM Sans',
                  }}
                >
                  {interest}
                </span>
              ))
            ) : (
              <p style={{ color: '#6B6B6B', fontSize: 14 }}>
                Выбери интересы нажав "Редактировать вкус"
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F7F7F5]">
            <span className="font-sans text-[11px] text-[#6B6B6B] uppercase tracking-wide font-medium">Бюджет</span>
            <span className="font-['DM_Mono'] text-[13px] text-[#0F0F0F] font-medium ml-auto">
              {fmtPrice(priceMin)} — {fmtPrice(priceMax)}
            </span>
          </div>
        </div>
      ) : (
        seller && (
          <div className={cardClass}>
            <h2 className="font-sans text-[13px] font-bold text-[#0F0F0F] uppercase tracking-wider mb-3">Бизнес-профиль</h2>
            <p className="font-sans text-[15px] font-semibold text-[#0F0F0F]">{seller.business_name}</p>
            <p className="font-sans text-[13px] text-[#6B6B6B] mt-1">
              {seller.city ? `📍 ${seller.city}` : ''} {seller.category ? `· ${seller.category}` : ''}
            </p>
            <p className="font-sans text-[13px] text-[#6B6B6B] mt-2">
              {plan ? `${plan.name} — ₽${plan.price_rub.toLocaleString('ru')}/мес` : 'Нет подписки'}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: 'Просмотры', value: monthStats.views },
                { label: 'Лайки', value: monthStats.likes },
                { label: 'Клики', value: monthStats.clicks },
              ].map(stat => (
                <div key={stat.label} className="bg-[#F7F7F5] rounded-xl p-2 text-center">
                  <p className="font-['DM_Mono'] text-[16px] text-[#0F0F0F]">{stat.value}</p>
                  <p className="font-sans text-[10px] text-[#6B6B6B]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Cart entry - only for buyers */}
      {profile.role === 'buyer' && (
        <div 
          onClick={() => setCartOpen(true)} 
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '16px 20px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <span style={{ fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500 }}>🛒 Корзина</span>
          <span style={{ color: '#6B6B6B' }}>→</span>
        </div>
      )}

      <div className={`${cardClass} space-y-3`}>
        <h2 className="font-sans text-[13px] font-bold text-[#0F0F0F] uppercase tracking-wider">
          Настройки
        </h2>

        <button
          type="button"
          onClick={() => logout()}
          className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] font-sans text-[15px] text-[#6B6B6B]"
        >
          Выйти из аккаунта
        </button>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full h-12 px-4 rounded-xl border border-[#FF4D4D] font-sans text-[15px] text-[#FF4D4D]"
          >
            Удалить аккаунт
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-[#FF4D4D]/30 p-4 space-y-3"
          >
            <p className="font-sans text-sm text-[#0F0F0F] font-medium">
              Вы уверены? Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-xl border border-[#EBEBEB] font-sans text-sm text-[#6B6B6B] hover:bg-[#F7F7F5] transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => deleteAccount()}
                className="flex-1 h-10 rounded-xl bg-[#FF4D4D] font-sans text-sm text-white font-semibold hover:opacity-90 transition-colors"
              >
                Удалить
              </button>
            </div>
          </motion.div>
        )}
      </div>
      {/* Toast */}
      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg font-sans text-sm font-semibold text-white ${msg.type === 'ok' ? 'bg-[#0F0F0F]' : 'bg-[#FF4D4D]'}`}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Taste edit modal */}
      <TasteEditModal
        isOpen={showTasteEdit}
        onClose={() => setShowTasteEdit(false)}
        initialInterests={interests}
        initialPriceMin={priceMin}
        initialPriceMax={priceMax}
        onSave={async (newInterests, newPriceMin, newPriceMax) => {
          setSaving(true)
          try {
            await updateTasteProfile(newInterests, newPriceMin, newPriceMax)
            setInterests(newInterests)
            setPriceMin(newPriceMin)
            setPriceMax(newPriceMax)
            setMsg({ type: 'ok', text: 'Вкус обновлён ✓' })
          } catch (error) {
            setMsg({ type: 'err', text: 'Ошибка сохранения' })
          } finally {
            setSaving(false)
          }
        }}
      />

      {/* Cart sheet */}
      <CartSheet
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
