import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const interactionSchema = z.object({
  item_id: z.string().uuid(),
  action: z.enum(['swipe_right', 'swipe_left', 'save', 'share', 'view_detail', 'external_click']),
  dwell_time_ms: z.number().int().optional(),
  swipe_speed: z.enum(['fast', 'medium', 'slow']).optional(),
  session_id: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // 1. Verify user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate payload
  const body: unknown = await req.json()
  const parsed = interactionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // 3. Insert into interactions table
  const { error } = await supabase.from('interactions').insert({
    user_id: user.id,
    item_id: parsed.data.item_id,
    action: parsed.data.action,
    dwell_time_ms: parsed.data.dwell_time_ms,
    swipe_speed: parsed.data.swipe_speed,
    session_id: parsed.data.session_id,
  })

  if (error) {
    console.error('Failed to log interaction:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
