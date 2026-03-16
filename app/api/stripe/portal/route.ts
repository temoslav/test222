import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (sellerError || !seller?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: seller.stripe_customer_id as string,
    return_url: `${appUrl}/dashboard`,
  })

  return NextResponse.json({ url: portalSession.url })
}
