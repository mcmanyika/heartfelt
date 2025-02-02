'use client'

import { useEffect, useState } from 'react'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users') // Calls the server route
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)

        setUsers(result.users || [])
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  if (loading) return (
    <div className="flex justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>

  return (
    <div className="bg-white mt-5 mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Registered Users</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="text-sm">
                <td className="px-6 py-4 whitespace-nowrap">{user.email || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-gray-500 text-sm">Total users: {users.length}</p>
    </div>
  )
}
