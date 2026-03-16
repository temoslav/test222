'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Пароль должен быть не менее 8 символов')
  .regex(/[A-Z]/, 'Пароль должен содержать хотя бы одну заглавную букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру')

const loginSchema = z.object({
  email: z.string().email({ message: 'Неверный формат e-mail' }),
  password: z.string().min(1, 'Введите пароль'),
})

const signupSchema = z.object({
  email: z.string().email({ message: 'Неверный формат e-mail' }),
  password: passwordSchema,
  role: z.enum(['buyer', 'seller'], { message: 'Выберите тип аккаунта' }),
})

export async function login(formData: FormData) {
  const supabase = await createClient()

  const rawData = Object.fromEntries(formData)
  const result = loginSchema.safeParse(rawData)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, password } = result.data

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return {
      error: 'Неверный e-mail или пароль. Попробуйте ещё раз.',
    }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_complete) {
      revalidatePath('/', 'layout')
      redirect(profile.role === 'seller' ? '/onboarding' : '/onboarding/buyer')
    }
  }

  const redirectTo = (formData.get('redirect') as string | null) ?? '/feed'
  revalidatePath('/', 'layout')
  redirect(redirectTo)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const rawData = Object.fromEntries(formData)
  const result = signupSchema.safeParse(rawData)

  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  const { email, password, role } = result.data

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: { role },
    },
  })

  if (error) {
    return {
      error: error.message || 'Не удалось создать аккаунт. Попробуйте позже или с другим адресом.',
    }
  }

  revalidatePath('/', 'layout')
  return {
    success: 'Мы отправили письмо с подтверждением на вашу почту. Перейдите по ссылке в письме, а затем войдите в аккаунт.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
