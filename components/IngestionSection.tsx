'use client'

import { useState } from 'react'
import { ingestCotData } from '@/lib/api'

const COMMODITIES = ['SILVER', 'GOLD', 'COPPER', 'CRUDE OIL']

export default function IngestionSection() {
  const [commodity, setCommodity] = useState('SILVER')
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  const [isIngesting, setIsIngesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [insertedCount, setInsertedCount] = useState(0)
  const [duplicateCount, setDuplicateCount] = useState(0)

  const handleIngest = async () => {
    setIsIngesting(true)
    setStatus('Fetching data from CFTC API...')
    setError(null)

    try {
      const result = await ingestCotData(
        commodity,
        startDate || undefined,
        endDate || undefined
      )

      setInsertedCount(result.inserted_count)
      setDuplicateCount(result.duplicate_count)

      // Use the message from the response if available, otherwise construct one
      if (result.message) {
        setStatus(result.message)
      } else if (result.duplicate_count > 0) {
        setStatus(
          `Ingested ${result.inserted_count} new records. Skipped ${result.duplicate_count} duplicates.`
        )
      } else if (result.inserted_count === 0) {
        setStatus('No new data found for the selected date range.')
      } else {
        setStatus(`Successfully ingested ${result.inserted_count} records`)
      }
    } catch (err: any) {
      setError(`Failed to ingest data: ${err.message}`)
      setStatus(null)
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Ingest Data</h2>

      <div className="space-y-4">
        {/* Commodity Selector */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Commodity</label>
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {COMMODITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Start Date (Optional)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Info Text */}
        <p className="text-sm text-gray-600">
          {startDate && endDate
            ? `Data between ${startDate} and ${endDate} will be ingested`
            : startDate
            ? `Data newer than ${startDate} will be ingested`
            : endDate
            ? `Data older than ${endDate} will be ingested`
            : 'Leave dates empty to fetch all records'}
        </p>

        {/* Ingest Button */}
        <button
          onClick={handleIngest}
          disabled={isIngesting}
          className="w-full bg-gold-primary text-white py-3 px-4 rounded-md font-semibold hover:bg-gold-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isIngesting ? 'Ingesting...' : 'Ingest Data'}
        </button>

        {/* Status/Error Messages */}
        {(status || error) && (
          <div
            className={`p-4 rounded-md ${
              error
                ? 'bg-red-50 text-red-800'
                : 'bg-green-50 text-green-800'
            }`}
          >
            {error ? (
              <div>
                <p className="font-semibold">Error: {error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div>
                <p className="font-semibold">{status}</p>
                {insertedCount > 0 && (
                  <p className="text-sm mt-1">
                    Records ingested: {insertedCount}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

