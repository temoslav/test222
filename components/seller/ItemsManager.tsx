'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface SellerItem {
  id: string
  title: string
  description: string | null
  price: number | null
  currency: string
  type: 'product' | 'event' | 'place'
  category: string | null
  subcategory: string | null
  brand: string | null
  city: string | null
  image_urls: string[]
  external_url: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

interface ItemFormData {
  title: string
  description: string
  price: string
  currency: string
  type: 'product' | 'event' | 'place'
  category: string
  subcategory: string
  brand: string
  city: string
  image_url: string
  external_url: string
}

const EMPTY_FORM: ItemFormData = {
  title: '',
  description: '',
  price: '',
  currency: 'RUB',
  type: 'product',
  category: '',
  subcategory: '',
  brand: '',
  city: '',
  image_url: '',
  external_url: '',
}

const CATEGORIES = [
  'Одежда и аксессуары',
  'Электроника',
  'Красота и уход',
  'Дом и интерьер',
  'Спорт и отдых',
  'Еда и напитки',
  'Искусство и дизайн',
  'Детские товары',
  'Книги и музыка',
  'Другое',
]

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Уфа',
  'Ростов-на-Дону',
]

function itemToForm(item: SellerItem): ItemFormData {
  return {
    title: item.title,
    description: item.description ?? '',
    price: item.price != null ? String(item.price) : '',
    currency: item.currency,
    type: item.type,
    category: item.category ?? '',
    subcategory: item.subcategory ?? '',
    brand: item.brand ?? '',
    city: item.city ?? '',
    image_url: item.image_urls[0] ?? '',
    external_url: item.external_url ?? '',
  }
}

interface ItemsManagerProps {
  initialItems: SellerItem[]
}

export default function ItemsManager({ initialItems }: ItemsManagerProps) {
  const [items, setItems] = useState<SellerItem[]>(initialItems)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ItemFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function openAddForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(item: SellerItem) {
    setEditingId(item.id)
    setForm(itemToForm(item))
    setFormError(null)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  function setField<K extends keyof ItemFormData>(key: K, value: ItemFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price ? Number(form.price) : null,
      currency: form.currency,
      type: form.type,
      category: form.category,
      subcategory: form.subcategory.trim() || null,
      brand: form.brand.trim() || null,
      city: form.city,
      image_urls: form.image_url.trim() ? [form.image_url.trim()] : [],
      external_url: form.external_url.trim() || null,
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/seller/items/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data: { item?: SellerItem; error?: string } = await res.json()
        if (!res.ok) {
          setFormError(data.error ?? 'Не удалось сохранить изменения')
          setSaving(false)
          return
        }
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingId
              ? { ...i, ...payload, updated_at: new Date().toISOString() }
              : i
          )
        )
      } else {
        const res = await fetch('/api/seller/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data: { item?: SellerItem; error?: string } = await res.json()
        if (!res.ok) {
          setFormError(data.error ?? 'Не удалось добавить товар')
          setSaving(false)
          return
        }
        if (data.item) {
          setItems((prev) => [data.item!, ...prev])
        }
      }
      closeForm()
    } catch {
      setFormError('Произошла ошибка. Попробуйте позже.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(item: SellerItem) {
    setTogglingId(item.id)
    try {
      const res = await fetch(`/api/seller/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i))
        )
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/seller/items/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[#6B6B6B]">
          {items.length === 0 ? 'Нет товаров' : `${items.length} ${items.length === 1 ? 'позиция' : items.length < 5 ? 'позиции' : 'позиций'}`}
        </p>
        <button
          onClick={openAddForm}
          className="h-10 px-4 bg-[#0F0F0F] text-white rounded-xl text-[13px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
        >
          + Добавить товар
        </button>
      </div>

      {/* Empty state */}
      {items.length === 0 && !isFormOpen && (
        <div className="bg-white rounded-3xl p-10 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          <span className="text-5xl">📦</span>
          <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#0F0F0F] mt-4 mb-2">
            Пока нет товаров
          </h3>
          <p className="text-[#6B6B6B] text-sm mb-5 max-w-xs mx-auto">
            Добавьте первый товар и он появится в ленте Swipely.
          </p>
          <button
            onClick={openAddForm}
            className="h-11 px-6 bg-[#0F0F0F] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Добавить первый товар →
          </button>
        </div>
      )}

      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
              >
                <div className="bg-white rounded-2xl px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center gap-3">
                  {/* Image thumbnail */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#F0F0F0]">
                    {item.image_urls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_urls[0]}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#C4C4C4] text-lg">
                        📷
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F0F0F] truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#6B6B6B]">{item.category}</span>
                      {item.price != null && (
                        <>
                          <span className="text-[#EBEBEB]">·</span>
                          <span className="font-['DM_Mono'] text-[12px] text-[#0F0F0F]">
                            ₽{item.price.toLocaleString('ru-RU')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-[#F0F0F0] text-[#6B6B6B]'
                      }`}
                    >
                      {item.is_active ? 'Активен' : 'Скрыт'}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(item)}
                      disabled={togglingId === item.id}
                      aria-label={item.is_active ? 'Скрыть' : 'Показать'}
                      className="w-8 h-8 rounded-lg bg-[#F7F7F5] hover:bg-[#EBEBEB] flex items-center justify-center text-[#6B6B6B] text-sm disabled:opacity-50 transition-all"
                    >
                      {item.is_active ? '👁' : '🚫'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditForm(item)}
                      aria-label="Редактировать"
                      className="w-8 h-8 rounded-lg bg-[#F7F7F5] hover:bg-[#EBEBEB] flex items-center justify-center text-[#6B6B6B] text-sm transition-all"
                    >
                      ✏️
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm(`Удалить «${item.title}»? Это действие нельзя отменить.`)) {
                          handleDelete(item.id)
                        }
                      }}
                      disabled={deletingId === item.id}
                      aria-label="Удалить"
                      className="w-8 h-8 rounded-lg bg-[#F7F7F5] hover:bg-red-50 hover:text-[#FF4D4D] flex items-center justify-center text-[#6B6B6B] text-sm disabled:opacity-50 transition-all"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit form modal */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="fixed inset-0 bg-black/30 z-40"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] max-h-[92vh] overflow-y-auto"
            >
              <div className="px-5 pt-4 pb-8 max-w-lg mx-auto">
                {/* Handle */}
                <div className="w-10 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-5" />

                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-['Playfair_Display'] text-xl font-bold text-[#0F0F0F]">
                    {editingId ? 'Редактировать' : 'Добавить товар'}
                  </h2>
                  <button
                    onClick={closeForm}
                    className="w-8 h-8 rounded-lg bg-[#F7F7F5] hover:bg-[#EBEBEB] flex items-center justify-center text-[#6B6B6B] transition-all"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Title */}
                  <Field label="Название" required>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      required
                      maxLength={200}
                      placeholder="Название товара или события"
                      className={inputCls}
                    />
                  </Field>

                  {/* Type */}
                  <Field label="Тип">
                    <div className="flex gap-2">
                      {(['product', 'event', 'place'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setField('type', t)}
                          className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-all ${
                            form.type === t
                              ? 'bg-[#0F0F0F] text-white'
                              : 'bg-[#F7F7F5] text-[#6B6B6B] hover:bg-[#EBEBEB]'
                          }`}
                        >
                          {t === 'product' ? 'Товар' : t === 'event' ? 'Событие' : 'Место'}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {/* Category + City in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Категория" required>
                      <select
                        value={form.category}
                        onChange={(e) => setField('category', e.target.value)}
                        required
                        className={selectCls}
                      >
                        <option value="" disabled>Выберите</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Город" required>
                      <select
                        value={form.city}
                        onChange={(e) => setField('city', e.target.value)}
                        required
                        className={selectCls}
                      >
                        <option value="" disabled>Выберите</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {/* Price + Brand in a row */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Цена (₽)">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={form.price}
                        onChange={(e) => setField('price', e.target.value)}
                        placeholder="4 900"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Бренд">
                      <input
                        type="text"
                        value={form.brand}
                        onChange={(e) => setField('brand', e.target.value)}
                        maxLength={100}
                        placeholder="Название бренда"
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  {/* Description */}
                  <Field label="Описание">
                    <textarea
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      maxLength={1000}
                      rows={3}
                      placeholder="Подробнее о товаре или событии"
                      className={`${inputCls} resize-none py-3`}
                    />
                  </Field>

                  {/* Image URL */}
                  <Field label="Ссылка на изображение">
                    <input
                      type="url"
                      value={form.image_url}
                      onChange={(e) => setField('image_url', e.target.value)}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </Field>

                  {/* External URL */}
                  <Field label="Ссылка на товар">
                    <input
                      type="url"
                      value={form.external_url}
                      onChange={(e) => setField('external_url', e.target.value)}
                      placeholder="https://..."
                      className={inputCls}
                    />
                  </Field>

                  {formError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[#FF4D4D] text-[13px] font-medium text-center"
                    >
                      {formError}
                    </motion.p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex-1 h-12 bg-[#F7F7F5] text-[#0F0F0F] rounded-xl text-sm font-semibold hover:bg-[#EBEBEB] transition-all"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 h-12 bg-[#0F0F0F] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {saving ? 'Сохраняем...' : editingId ? 'Сохранить' : 'Добавить'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#0F0F0F] mb-1.5 ml-0.5">
        {label}
        {required && <span className="text-[#FF4D4D] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full h-11 px-3.5 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] placeholder:text-[#C4C4C4] focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all bg-white'

const selectCls =
  'w-full h-11 px-3.5 rounded-xl border border-[#EBEBEB] text-sm text-[#0F0F0F] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all appearance-none cursor-pointer'
