'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Header from './components/layout/Header'
import {  Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import UsersList from './components/UsersList'
import { usePathname } from 'next/navigation'
import Sidebar from './components/layout/Sidebar'

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSuperUser, setIsSuperUser] = useState(false)
  
  useEffect(() => {
    const supabase = createClient()
    
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/signin')
        return
      }

      // Check if user is super_user and verified
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, status')
        .eq('id', session.user.id)
        .single()

      setIsSuperUser(
        profile?.user_type === 'super_user' && 
        profile?.status === 'verified'
      )
    }
    
    checkUser()
  }, [router])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside 
        className={`h-screen w-16 hover:w-64 text-gray-700 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : ''
        } group`}
      >
        <Sidebar />
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-8 transition-all duration-300">
          <Header />
          {isSuperUser && <UsersList />}
      </main>
    </div>
  );
}
