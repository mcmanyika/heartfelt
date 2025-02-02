import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Ensure this is set in your .env file
)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    return NextResponse.json({ users: data.users })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
