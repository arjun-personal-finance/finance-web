'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import IngestionSection from '@/components/IngestionSection'
import ViewDataSection from '@/components/ViewDataSection'
import { isAuthenticated, isAdmin } from '@/lib/auth'

export default function CotPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
    }
  }, [router])

  if (!isAuthenticated()) {
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

        {isAdmin() ? (
          <IngestionSection />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Ingest Data</h2>
            <p className="text-gray-600">
              This feature is only available to administrators.
            </p>
          </div>
        )}
        <ViewDataSection />
      </div>
    </main>
  )
}

