'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ViewDataSection from '@/components/ViewDataSection'
import { isAuthenticated } from '@/lib/auth'

export default function CotPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    const authStatus = isAuthenticated()
    setIsAuth(authStatus)
    setIsLoading(false)

    if (!authStatus) {
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

  if (!isAuth) {
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
              Commitment of Traders (COT) Data
            </h1>
          </div>
        </div>

        <ViewDataSection />
      </div>
    </main>
  )
}
