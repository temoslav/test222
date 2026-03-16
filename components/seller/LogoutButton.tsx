'use client'

import { useState } from 'react'
import { logout } from '@/app/auth/actions'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await logout()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-[13px] font-medium text-[#6B6B6B] hover:text-[#0F0F0F] disabled:opacity-50 transition-colors"
    >
      {loading ? 'Выходим...' : 'Выйти'}
    </button>
  )
}
