'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ── Step 1: Role ──────────────────────────────────────────────
export async function saveRole(role: 'buyer' | 'seller') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (error) return { error: 'Не удалось сохранить роль.' }
  return { success: true }
}

// ── Step 2+3 (buyer): interests + price range + complete ──────
const buyerSchema = z.object({
  interests: z.array(z.string()).min(3, 'Выберите хотя бы 3 категории'),
  price_min: z.number().int().min(0),
  price_max: z.number().int().max(100000),
})

export async function saveBuyerProfile(
  interests: string[],
  price_min: number,
  price_max: number,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = buyerSchema.safeParse({ interests, price_min, price_max })
  if (!result.success) return { error: result.error.issues[0].message }

  const { error } = await supabase
    .from('profiles')
    .update({
      interests: result.data.interests,
      price_min: result.data.price_min,
      price_max: result.data.price_max,
      onboarding_complete: true,
    })
    .eq('id', user.id)

  if (error) {
    console.error('saveBuyerProfile error:', error)
    return { error: 'Не удалось сохранить профиль. Попробуйте ещё раз.' }
  }

  revalidatePath('/', 'layout')
  redirect('/feed')
}

// ── Step 4 (seller): create seller record + complete ─────────
const sellerSchema = z.object({
  business_name: z.string().min(2, 'Название должно быть не менее 2 символов').max(100),
  description:   z.string().max(200).optional(),
  city:          z.string().min(2, 'Укажите город'),
  category:      z.string().min(1, 'Выберите категорию'),
})

export async function createSellerProfileOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = Object.fromEntries(formData)
  const result = sellerSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const { data: existing } = await supabase
    .from('sellers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!existing) {
    const { error: insertErr } = await supabase
      .from('sellers')
      .insert({
        user_id: user.id,
        business_name: result.data.business_name,
        description:   result.data.description ?? null,
        city:          result.data.city,
        category:      result.data.category,
      })
    if (insertErr) {
      console.error('createSellerProfileOnboarding error:', insertErr)
      return { error: 'Не удалось создать профиль продавца. Попробуйте ещё раз.' }
    }
  }

  await supabase
    .from('profiles')
    .update({ role: 'seller', onboarding_complete: true })
    .eq('id', user.id)

  revalidatePath('/', 'layout')
  redirect('/feed')
}

// ── Legacy: kept for backward compat ─────────────────────────
export async function completeBuyerOnboarding(formData: FormData) {
  const interests = formData.getAll('interests') as string[]
  return saveBuyerProfile(interests, 0, 50000)
}

