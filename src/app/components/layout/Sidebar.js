import React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { navigation } from './navigation'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  return (
    
    <div className="h-full flex flex-col">
    <h1 className="text-2xl font-bold text-gray-900 p-4 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300">Profaith</h1>
    <div className="flex-grow mt-4 overflow-hidden">
      <nav className="px-2 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
              pathname === item.href
                ? 'text-gray-900'
                : 'text-gray-700 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <item.icon className={`mr-3 h-6 w-6 flex-shrink-0 ${
              pathname === item.href ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-300'
            }`} />
            <span className="overflow-hidden transition-all duration-300">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  </div>
  )
}
