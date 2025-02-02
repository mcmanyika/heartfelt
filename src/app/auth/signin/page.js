'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '../../../utils/supabase/client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignIn() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (session) {
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking auth session:', error)
        router.push('/auth/signin')
      } finally {
        setIsLoading(false)
      }
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/')
      } else {
        router.push('/auth/signin')
      }
    })

    checkUser()

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
    }
  }, [router, supabase])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">
      <div>Loading...</div>
    </div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-2xl">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#404040',
                  brandAccent: '#262626',
                },
              },
            },
          }}
          theme="light"
          showLinks={true}
          providers={[]}
          redirectTo={process.env.NEXT_PUBLIC_SITE_URL 
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
            : `${window.location.origin}/auth/callback`}
          onAuthSuccess={() => {
            router.push('/');
          }}
        />
      </div>
    </div>
  )
} 