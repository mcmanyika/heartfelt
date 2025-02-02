'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOut() {
  // Clear the session cookie
  cookies().delete('session')
  
  // Redirect to sign in page
  redirect('/auth/signin')
} 