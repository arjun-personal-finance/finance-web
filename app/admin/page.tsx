'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import IngestionSection from '@/components/IngestionSection'
import { isAuthenticated, isAdmin } from '@/lib/auth'

export default function AdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)

  useEffect(() => {
    const authStatus = isAuthenticated()
    const adminStatus = isAdmin()
    setIsAuth(authStatus)
    setIsAdminUser(adminStatus)
    setIsLoading(false)

    if (!authStatus || !adminStatus) {
      router.push('/')
    }
  }, [router])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </main>
    )
  }

  if (!isAuth || !isAdminUser) {
    return null // Will redirect
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 mb-2 inline-block text-sm"
            >
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Panel
            </h1>
          </div>
        </div>

        <IngestionSection />
      </div>
    </main>
  )
}