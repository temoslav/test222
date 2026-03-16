'use client'

import { useState } from 'react'
import { signup } from '@/app/auth/actions'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

type Role = 'buyer' | 'seller'

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: '', color: '#EBEBEB' },
    { label: 'Слабый', color: '#FF4D4D' },
    { label: 'Средний', color: '#FFB800' },
    { label: 'Хороший', color: '#4CAF50' },
    { label: 'Отличный', color: '#22C55E' },
  ]
  return { score, ...map[score] }
}

export default function SignupPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)

  async function handleSubmit(formData: FormData) {
    if (!role) { setError('Выберите тип аккаунта'); return }
    formData.set('role', role)
    setLoading(true)
    setError(null)
    setSuccess(null)
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(result.success)
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
        <div className="text-center mb-8">
          <h1 className="font-['Playfair_Display'] text-4xl font-bold text-[#0F0F0F] mb-2 tracking-tight">
            Swipely
          </h1>
          <p className="font-sans text-[#6B6B6B] text-sm font-medium">
            Начните открывать новое
          </p>
        </div>

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="font-sans font-bold text-lg text-[#0F0F0F] mb-2">Ура!</h2>
              <p className="font-sans text-sm text-[#6B6B6B] leading-relaxed">{success}</p>
              <div className="mt-8">
                <Link href="/login" className="font-sans text-sm font-semibold text-[#0F0F0F] hover:underline">
                  Вернуться к входу
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form">
              {/* Role selector */}
              <p className="font-sans text-[13px] font-semibold text-[#0F0F0F] mb-3">
                Я хочу:
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {([
                  { value: 'buyer' as Role, icon: '🔥', title: 'Я покупатель', sub: 'Открывать и сохранять' },
                  { value: 'seller' as Role, icon: '🏪', title: 'Я продавец', sub: 'Продавать в ленте' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all text-center ${
                      role === opt.value
                        ? 'border-[#0F0F0F] bg-[#0F0F0F]/5'
                        : 'border-[#EBEBEB] hover:border-[#C4C4C4]'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-sans text-[13px] font-semibold text-[#0F0F0F] leading-tight">
                      {opt.title}
                    </span>
                    <span className="font-sans text-[11px] text-[#6B6B6B]">{opt.sub}</span>
                  </button>
                ))}
              </div>

              <form action={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-sans text-[13px] font-medium text-[#0F0F0F] mb-1.5 ml-1">
                    Электронная почта
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all"
                    placeholder="name@example.com"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-[#EBEBEB] font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#0F0F0F]/10 focus:border-[#0F0F0F] transition-all"
                    placeholder="Мин. 8 символов, заглавная, цифра"
                  />
                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{
                              backgroundColor: i <= strength.score ? strength.color : '#EBEBEB',
                            }}
                          />
                        ))}
                      </div>
                      {strength.label && (
                        <p className="font-sans text-[11px]" style={{ color: strength.color }}>
                          {strength.label}
                        </p>
                      )}
                    </div>
                  )}
                  <ul className="mt-2 space-y-0.5">
                    {[
                      { ok: password.length >= 8, text: 'Минимум 8 символов' },
                      { ok: /[A-Z]/.test(password), text: 'Одна заглавная буква' },
                      { ok: /[0-9]/.test(password), text: 'Одна цифра' },
                    ].map(({ ok, text }) => (
                      <li key={text} className={`font-sans text-[11px] flex items-center gap-1 ${ok ? 'text-[#4CAF50]' : 'text-[#B0B0B0]'}`}>
                        <span>{ok ? '✓' : '○'}</span> {text}
                      </li>
                    ))}
                  </ul>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[#FF4D4D] text-[13px] font-medium text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || !role}
                  className="w-full h-12 bg-[#0F0F0F] text-white rounded-xl font-sans font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98] disabled:opacity-40 mt-2"
                >
                  {loading ? 'Создание...' : 'Создать аккаунт →'}
                </button>
              </form>

              <div className="mt-6 text-center border-t border-[#EBEBEB] pt-6">
                <p className="font-sans text-[13px] text-[#6B6B6B]">
                  Уже есть аккаунт?{' '}
                  <Link
                    href="/login"
                    className="text-[#0F0F0F] font-semibold hover:underline decoration-[#FF4D4D] decoration-2 underline-offset-4"
                  >
                    Войти
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

