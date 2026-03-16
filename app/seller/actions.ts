'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const sellerSchema = z.object({
  business_name: z.string().min(2, 'Название должно быть не менее 2 символов').max(100),
  description: z.string().max(500).optional(),
  city: z.string().min(2, 'Укажите город'),
  category: z.string().min(1, 'Выберите категорию'),
})

export async function registerSeller(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const rawData = Object.fromEntries(formData)
  const result = sellerSchema.safeParse(rawData)
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { data: existing } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    redirect('/dashboard')
  }

  const { error } = await supabase
    .from('sellers')
    .insert({
      user_id: user.id,
      business_name: result.data.business_name,
      description: result.data.description ?? null,
      city: result.data.city,
      category: result.data.category,
    })

  if (error) {
    console.error('Failed to register seller:', error)
    return { error: 'Не удалось создать аккаунт продавца. Попробуйте позже.' }
  }

  await supabase
    .from('profiles')
    .update({ role: 'seller', onboarding_complete: true })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
