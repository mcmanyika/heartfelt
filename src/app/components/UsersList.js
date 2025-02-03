'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [filterText, setFilterText] = useState('')

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/users') // Calls the server route
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)

        setUsers(result.profiles || [])
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleUserClick = (user) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedUsers = users
    .filter(user => {
      const searchText = filterText.toLowerCase()
      return (
        user.first_name?.toLowerCase().includes(searchText) ||
        user.last_name?.toLowerCase().includes(searchText) ||
        user.user_type?.toLowerCase().includes(searchText) ||
        user.status?.toLowerCase().includes(searchText)
      )
    })
    .sort((a, b) => {
      if (!sortField) return 0
      
      const aValue = a[sortField] || ''
      const bValue = b[sortField] || ''
      
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue)
      } else {
        return bValue.localeCompare(aValue)
      }
    })

  if (loading) return (
    <div className="flex justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>

  return (
    <div className="bg-white mt-5 mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Registered Users</h2>
      
      {/* Add search input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users..."
          className="w-full px-4 py-2 border rounded-lg"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['first_name', 'last_name', 'user_type', 'status'].map((field) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(field)}
                >
                  {field.replace('_', ' ')}
                  {sortField === field && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredAndSortedUsers.map((user) => (
              <tr 
                key={user.id} 
                className="text-sm hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleUserClick(user)}
              >
                <td className="px-6 py-4 whitespace-nowrap">{user.first_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.last_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.user_type || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.status || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <p className="mt-4 text-gray-500 text-sm">
        Showing {filteredAndSortedUsers.length} of {users.length} users
      </p>

      {/* User Details Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 transition-all duration-500 ease-in-out"
          onClick={() => setShowModal(false)}
        >
          <div 
            className={`fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${
              showModal ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold">User Details</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {selectedUser && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        <p className="mt-1 text-sm">{selectedUser.first_name || 'N/A'}</p>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Last Name</label>
                        <p className="mt-1 text-sm">{selectedUser.last_name || 'N/A'}</p>
                      </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">User Type</label>
                      <p className="mt-1 text-sm">{selectedUser.user_type || 'N/A'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <p className="mt-1 text-sm">{selectedUser.status || 'N/A'}</p>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                      <p className="mt-1 text-sm">
                        {selectedUser.updated_at ? new Date(selectedUser.updated_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="mb-4 col-span-2">
                      <div className="mt-2 flex justify-center p-4 bg-white rounded-lg">
                        <QRCodeSVG
                          value={selectedUser.id.toString()}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
