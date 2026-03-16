'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const profileSchema = z.object({
  display_name: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
})

export async function updateProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const raw = Object.fromEntries(formData)
  const result = profileSchema.safeParse(raw)
  if (!result.success) return { error: result.error.issues[0].message }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: result.data.display_name ?? null,
      city: result.data.city ?? null,
    })
    .eq('id', user.id)

  if (error) return { error: 'Не удалось сохранить. Попробуйте ещё раз.' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateInterests(interests: string[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (interests.length < 1) return { error: 'Выберите хотя бы одну категорию' }

  const { error } = await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', user.id)

  if (error) return { error: 'Не удалось обновить интересы.' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateTasteProfile(
  interests: string[],
  price_min: number,
  price_max: number,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (interests.length < 1) return { error: 'Выберите хотя бы одну категорию' }

  const { error } = await supabase
    .from('profiles')
    .update({ interests, price_min, price_max })
    .eq('id', user.id)

  if (error) return { error: 'Не удалось сохранить.' }

  revalidatePath('/profile')
  return { success: true }
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: 'Не удалось обновить аватар.' }

  revalidatePath('/profile')
  return { success: true }
}

export async function deleteAccount() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Удаление аккаунта временно недоступно.' }
  }

  const admin = createAdminClient()

  await supabase.auth.signOut()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Failed to delete user:', error)
    return { error: 'Не удалось удалить аккаунт. Свяжитесь с поддержкой.' }
  }

  revalidatePath('/', 'layout')
  redirect('/login')
}
