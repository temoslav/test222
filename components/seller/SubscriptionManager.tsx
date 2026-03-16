'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { STRIPE_PLANS } from '@/lib/plans'
import type { SubscriptionTier } from '@/types'

interface SubscriptionManagerProps {
  hasCustomer: boolean
  currentTier: SubscriptionTier | null
  isActive: boolean
}

const PLAN_ORDER: SubscriptionTier[] = ['start', 'business', 'brand']

export default function SubscriptionManager({
  hasCustomer,
  currentTier,
  isActive,
}: SubscriptionManagerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSelectPlan(tier: SubscriptionTier) {
    setLoading(tier)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data: { url?: string; error?: string } = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Не удалось открыть страницу оплаты')
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Произошла ошибка. Попробуйте позже.')
      setLoading(null)
    }
  }

  async function handleManageBilling() {
    setLoading('portal')
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data: { url?: string; error?: string } = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Не удалось открыть портал управления подпиской')
        setLoading(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Произошла ошибка. Попробуйте позже.')
      setLoading(null)
    }
  }

  if (isActive) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-[#6B6B6B]">Управление подпиской</p>
            <p className="text-sm text-[#0F0F0F] mt-0.5">
              Изменить тариф, отменить или посмотреть историю платежей.
            </p>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={loading === 'portal'}
            className="ml-4 shrink-0 h-10 px-4 bg-[#F7F7F5] text-[#0F0F0F] rounded-xl text-[13px] font-semibold hover:bg-[#EBEBEB] active:scale-[0.97] disabled:opacity-50 transition-all"
          >
            {loading === 'portal' ? '...' : 'Управлять →'}
          </button>
        </div>
        {error && (
          <p className="text-[#FF4D4D] text-[12px] font-medium mt-3">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {PLAN_ORDER.map((tier) => {
        const plan = STRIPE_PLANS[tier]
        const isPopular = tier === 'business'
        const isCurrent = currentTier === tier
        const isLoading = loading === tier

        return (
          <motion.div
            key={tier}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: PLAN_ORDER.indexOf(tier) * 0.06 }}
            className={`bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-2 transition-all ${
              isPopular ? 'border-[#0F0F0F]' : 'border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-['Playfair_Display'] font-bold text-[#0F0F0F] text-lg">
                    {plan.name}
                  </span>
                  {isPopular && (
                    <span className="text-[10px] font-semibold text-white bg-[#FF4D4D] px-2 py-0.5 rounded-full tracking-wide">
                      Популярный
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] font-semibold text-white bg-[#6B6B6B] px-2 py-0.5 rounded-full">
                      Текущий
                    </span>
                  )}
                </div>
                <p className="font-['DM_Mono'] text-xl font-medium text-[#0F0F0F]">
                  ₽{plan.price_rub.toLocaleString('ru-RU')}
                  <span className="font-sans text-[13px] font-normal text-[#6B6B6B]">/мес</span>
                </p>
                <ul className="mt-2 space-y-1">
                  {(plan.features as readonly string[]).map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B]">
                      <span className="text-green-600 text-[11px]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan(tier)}
                disabled={!!loading}
                className={`shrink-0 h-10 px-4 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-50 ${
                  isPopular
                    ? 'bg-[#0F0F0F] text-white hover:opacity-90'
                    : 'bg-[#F7F7F5] text-[#0F0F0F] hover:bg-[#EBEBEB]'
                }`}
              >
                {isLoading ? '...' : 'Выбрать'}
              </button>
            </div>
          </motion.div>
        )
      })}

      {error && (
        <p className="text-[#FF4D4D] text-[13px] font-medium text-center py-1">{error}</p>
      )}

      <p className="text-center text-[11px] text-[#6B6B6B] pt-1">
        Безопасная оплата через Stripe · Отмена в любой момент
      </p>
    </div>
  )
}
