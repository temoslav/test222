import { redirect } from 'next/navigation'
import BottomNav from '@/components/nav/BottomNav'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: UserRole = 'buyer'
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', user.id)
      .single()

    if (data && !data.onboarding_complete) {
      redirect('/onboarding')
    }
    role = (data?.role as UserRole) ?? 'buyer'
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <div className="mx-auto w-full" style={{ maxWidth: 430, paddingBottom: 80 }}>
        {children}
      </div>
      <BottomNav role={role} />
    </div>
  )
}
