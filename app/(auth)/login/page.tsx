'use client'

import { useState } from 'react'
import { login } from '@/app/auth/actions'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] bg-white rounded-[32px] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
      >
        <div className="text-center mb-10">
          <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[#0F0F0F] mb-2 tracking-tight">
            Swipely
          </h1>
          <p className="font-sans text-[#6B6B6B] text-sm">
            Ваша персональная лента открытий
          </p>
        </div>

        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-sans text-[13px] font-medium text-[#0F0F0F] mb-1.5 ml-1">
              Электронная почта
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D4D]/20 focus:border-[#FF4D4D] transition-all"
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="block font-sans text-[13px] font-medium text-[#0F0F0F] mb-1.5 ml-1">
              Пароль
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D4D]/20 focus:border-[#FF4D4D] transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-[#FF4D4D] text-[13px] font-medium text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#0F0F0F] text-white rounded-xl font-sans font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="font-sans text-[13px] text-[#6B6B6B]">
            Нет аккаунта?{' '}
            <Link 
              href="/signup" 
              className="text-[#0F0F0F] font-semibold hover:underline decoration-[#FF4D4D] decoration-2 underline-offset-4"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

