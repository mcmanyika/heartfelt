import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Ensure this is set in your .env file
)

export async function GET() {
  try {
    // Get users
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    if (usersError) throw usersError

    // Get profiles
    const { data: profilesData, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
    if (profilesError) throw profilesError

    return NextResponse.json({ 
      users: usersData.users,
      profiles: profilesData 
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    // Get the profile data from request body
    const { id, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Update the profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ profile: data[0] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
