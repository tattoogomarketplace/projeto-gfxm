import { NextResponse } from 'next/server'
// TODO: Migrar lógica para Prisma e Clerk
// import { createClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const requestUrl = new URL(request.url)
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
