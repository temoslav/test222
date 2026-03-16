import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the email confirmation redirect from Supabase.
// After the user clicks the link in their inbox, Supabase redirects here
// with a code that we exchange for a session.  We then route the user to
// the correct onboarding step based on their role.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/feed'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_complete')
          .eq('id', user.id)
          .single()

        if (profile && !profile.onboarding_complete) {
          const dest = profile.role === 'seller' ? '/onboarding' : '/onboarding/buyer'
          return NextResponse.redirect(`${origin}${dest}`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
