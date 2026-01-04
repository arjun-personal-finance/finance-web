'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getCotDataByCommodity,
  getCotDataByDateRange,
  getLatestCotData,
  getTrendData,
  getHistoricalPriceData,
  getCommoditySymbol,
  type CotDataPoint,
  type TrendDataPoint,
  type HistoricalPricePoint,
} from '@/lib/api'
import TrendChart from './TrendChart'

const COMMODITIES = ['SILVER', 'GOLD', 'COPPER', 'CRUDE OIL']

// Field categories matching mobile app
const FIELD_CATEGORIES = [
  {
    name: 'Managed Money',
    fields: ['m_money_positions_long_all', 'm_money_positions_short_all'],
    meaning: 'Positions held by speculative money managers (hedge funds, CTAs).',
    whyItMatters:
      'Often the biggest driver of price swings because these traders are trend-followers.',
  },
  {
    name: 'Producer / Merchant / Processor',
    fields: ['prod_merc_positions_long', 'prod_merc_positions_short'],
    meaning: 'Hedgers who use futures to manage physical exposure.',
    whyItMatters:
      'Their positions often reflect fundamental supply/demand rather than speculation.',
  },
  {
    name: 'Swap Dealers',
    fields: ['swap_positions_long_all', 'swap__positions_short_all'],
    meaning: 'Financial institutions that hedge OTC swap risk.',
    whyItMatters:
      'Often take the other side of managed money — serves as liquidity but also shows speculative pressure.',
  },
  {
    name: 'Other Reportables',
    fields: ['other_rept_positions_long', 'other_rept_positions_short'],
    meaning: 'Other large reporting traders that don\'t fit the main categories.',
    whyItMatters:
      'Provides additional context on market participation beyond the main trader categories.',
  },
  {
    name: 'Change from Previous Week',
    fields: [
      'change_in_open_interest_all',
      'change_in_m_money_long_all',
      'change_in_m_money_short_all',
      'change_in_prod_merc_long',
      'change_in_prod_merc_short',
      'change_in_swap_long_all',
      'change_in_swap_short_all',
      'change_in_other_rept_long',
      'change_in_other_rept_short',
    ],
    meaning: 'Shows momentum — whether traders are piling into or out of positions.',
    whyItMatters: 'Sudden changes often precede price moves.',
  },
  {
    name: 'Percent of Open Interest',
    fields: [
      'pct_of_open_interest_all',
      'pct_of_oi_m_money_long_all',
      'pct_of_oi_m_money_short_all',
      'pct_of_oi_prod_merc_long',
      'pct_of_oi_prod_merc_short',
      'pct_of_oi_swap_long_all',
      'pct_of_oi_swap_short_all',
      'pct_of_oi_other_rept_long',
      'pct_of_oi_other_rept_short',
    ],
    meaning: 'Normalizes positions across different markets and contract sizes.',
    whyItMatters:
      'Easier to compare against price changes and understand relative position sizes.',
  },
  {
    name: 'Number of Traders',
    fields: [
      'traders_tot_all',
      'traders_m_money_long_all',
      'traders_m_money_short_all',
      'traders_prod_merc_long_all',
      'traders_prod_merc_short_all',
      'traders_swap_long_all',
      'traders_swap_short_all',
      'traders_other_rept_long_all',
      'traders_other_rept_short',
    ],
    meaning: 'Indicates breadth of participation in the market.',
    whyItMatters:
      'If large positions come from very few traders, the signal may be weaker.',
  },
]

const ALL_FIELDS = FIELD_CATEGORIES.flatMap((cat) => cat.fields)

export default function ViewDataSection() {
  const [commodity, setCommodity] = useState('SILVER')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [latestData, setLatestData] = useState<CotDataPoint | null>(null)
  const [historicalData, setHistoricalData] = useState<CotDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Trend chart state
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [trendDataMap, setTrendDataMap] = useState<Record<string, TrendDataPoint[]>>({})
  const [isTrendLoading, setIsTrendLoading] = useState(false)
  const [showPriceVolume, setShowPriceVolume] = useState(false)
  const [priceVolumeData, setPriceVolumeData] = useState<HistoricalPricePoint[]>([])
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isFieldSelectorExpanded, setIsFieldSelectorExpanded] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Loading data for commodity:', commodity, 'startDate:', startDate, 'endDate:', endDate)
      
      // Always load latest
      const latest = await getLatestCotData(commodity)
      console.log('Latest data received:', latest)
      setLatestData(latest)

      // Load historical based on date filters
      let historical: CotDataPoint[] = []
      if (startDate && endDate) {
        historical = await getCotDataByDateRange(commodity, startDate, endDate)
      } else if (startDate) {
        const today = new Date().toISOString().split('T')[0]
        historical = await getCotDataByDateRange(commodity, startDate, today)
      } else if (endDate) {
        historical = await getCotDataByDateRange(commodity, '1900-01-01', endDate)
      }

      console.log('Historical data received:', historical.length, 'records')

      // Sort by date descending
      historical.sort((a, b) => {
        const dateA = a.report_date_as_yyyy_mm_dd || ''
        const dateB = b.report_date_as_yyyy_mm_dd || ''
        return dateB.localeCompare(dateA)
      })

      setHistoricalData(historical)
      console.log('State updated - latestData:', latest !== null, 'historicalData:', historical.length)
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendData = useCallback(async () => {
    if (selectedFields.length === 0) {
      setTrendDataMap({})
      return
    }

    setIsTrendLoading(true)
    try {
      // Fetch data for all selected fields in parallel
      const dataPromises = selectedFields.map(async (field) => {
        try {
          const data = await getTrendData(commodity, field, 999)
          return { field, data }
        } catch (err: any) {
          console.error(`Failed to load trend data for field ${field}:`, err)
          return { field, data: [] }
        }
      })

      const results = await Promise.all(dataPromises)
      const newTrendDataMap: Record<string, TrendDataPoint[]> = {}
      
      results.forEach(({ field, data }) => {
        newTrendDataMap[field] = data
      })

      setTrendDataMap(newTrendDataMap)

      // Load price/volume if enabled - use the earliest date from all fields
      if (showPriceVolume && results.length > 0) {
        const allDates = results
          .flatMap(({ data }) => data.map((d) => d.reportDate))
          .sort()
        
        if (allDates.length > 0) {
          const start = allDates[0]
          const end = allDates[allDates.length - 1]
          const symbol = getCommoditySymbol(commodity)
          
          // Limit date range to avoid rate limiting (max 2 years)
          const startDate = new Date(start)
          const twoYearsAgo = new Date()
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
          
          // Use more recent date if range is too large
          const finalStart = startDate < twoYearsAgo ? twoYearsAgo.toISOString().split('T')[0] : start
          
          try {
            const priceData = await getHistoricalPriceData(symbol, finalStart, end, '1d')
            setPriceVolumeData(priceData)
            if (priceData.length === 0) {
              console.warn('No price/volume data received. This might be due to rate limiting.')
            }
          } catch (error) {
            console.error('Failed to load price/volume data:', error)
            setPriceVolumeData([])
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load trend data:', err)
    } finally {
      setIsTrendLoading(false)
    }
  }, [commodity, selectedFields, showPriceVolume])

  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (selectedFields.length > 0) {
      // Debounce the loadTrendData call by 200ms
      debounceTimerRef.current = setTimeout(() => {
        loadTrendData()
      }, 200)
    } else {
      setTrendDataMap({})
    }

    // Cleanup function to clear timer on unmount or dependency change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [commodity, selectedFields, loadTrendData])

  useEffect(() => {
    if (showPriceVolume && Object.keys(trendDataMap).length > 0) {
      // Get first date from all trend data (earliest date across all fields)
      const allDates = Object.values(trendDataMap)
        .flatMap((data) => data.map((d) => d.reportDate))
        .sort()
      
      if (allDates.length > 0) {
        const start = allDates[0] // First date of field series
        // End date is current date (today)
        const today = new Date().toISOString().split('T')[0]
        
        const symbol = getCommoditySymbol(commodity)
        
        getHistoricalPriceData(symbol, start, today, '1d')
          .then((data) => {
            setPriceVolumeData(data)
            if (data.length === 0) {
              console.warn('No price/volume data received. This might be due to rate limiting or date range issues.')
            }
          })
          .catch((error) => {
            console.error('Failed to load price/volume data:', error)
            setPriceVolumeData([])
          })
      }
    } else {
      setPriceVolumeData([])
    }
  }, [showPriceVolume, trendDataMap, commodity])

  const handleFieldToggle = (field: string) => {
    setSelectedFields((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field)
      } else {
        return [...prev, field]
      }
    })
  }

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-xl font-semibold">View Data</h2>

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

      {/* Date Filters */}
      <div className="bg-gray-50 p-4 rounded-md space-y-4">
        <h3 className="font-semibold">Recent</h3>
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

        <button
          onClick={loadData}
          disabled={isLoading}
          className="w-full bg-gold-primary text-white py-2 px-4 rounded-md font-semibold hover:bg-gold-dark disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Load Data'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {/* Latest Data */}
      {latestData ? (
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="font-semibold mb-3">Latest Data</h3>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Report Date:</span>
              <span className="font-semibold">
                {latestData.report_date_as_yyyy_mm_dd || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Commodity:</span>
              <span className="font-semibold">
                {latestData.commodity_name || 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="border-t border-green-200 pt-3 mt-3">
            <div className="text-sm font-semibold mb-2">Key Metrics</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {latestData.open_interest_all !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Open Interest:</span>
                  <span className="font-medium">
                    {latestData.open_interest_all.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.prod_merc_positions_long !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Prod/Merc Long:</span>
                  <span className="font-medium">
                    {latestData.prod_merc_positions_long.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.prod_merc_positions_short !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Prod/Merc Short:</span>
                  <span className="font-medium">
                    {latestData.prod_merc_positions_short.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.swap_positions_long_all !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Swap Long:</span>
                  <span className="font-medium">
                    {latestData.swap_positions_long_all.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.swap__positions_short_all !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Swap Short:</span>
                  <span className="font-medium">
                    {latestData.swap__positions_short_all.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.m_money_positions_long_all !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">M Money Long:</span>
                  <span className="font-medium">
                    {latestData.m_money_positions_long_all.toLocaleString()}
                  </span>
                </div>
              )}
              {latestData.m_money_positions_short_all !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">M Money Short:</span>
                  <span className="font-medium">
                    {latestData.m_money_positions_short_all.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Changes Section */}
            {latestData.change_in_open_interest_all !== undefined && (
              <>
                <div className="border-t border-green-200 pt-3 mt-3">
                  <div className="text-sm font-semibold mb-2">Changes</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">OI Change:</span>
                      <span
                        className={`font-medium ${
                          (latestData.change_in_open_interest_all || 0) >= 0
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`}
                      >
                        {(latestData.change_in_open_interest_all || 0) >= 0
                          ? '+'
                          : ''}
                        {latestData.change_in_open_interest_all.toLocaleString()}
                      </span>
                    </div>
                    {latestData.change_in_prod_merc_long !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prod/Merc Long Δ:</span>
                        <span
                          className={`font-medium ${
                            (latestData.change_in_prod_merc_long || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {(latestData.change_in_prod_merc_long || 0) >= 0
                            ? '+'
                            : ''}
                          {latestData.change_in_prod_merc_long.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {latestData.change_in_m_money_long_all !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">M Money Long Δ:</span>
                        <span
                          className={`font-medium ${
                            (latestData.change_in_m_money_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {(latestData.change_in_m_money_long_all || 0) >= 0
                            ? '+'
                            : ''}
                          {latestData.change_in_m_money_long_all.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600">
          No latest data available. Click "Load Data" to fetch.
        </div>
      )}

      {/* Historical Data */}
      {historicalData.length > 0 ? (
        <div>
          <h3 className="font-semibold mb-2">
            Historical Data ({historicalData.length} records)
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {historicalData.map((data, idx) => {
              const isExpanded = expandedCardIndex === idx
              return (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-md text-sm border border-gray-200 overflow-hidden"
                >
                  {/* Header - Always visible and clickable */}
                  <div
                    onClick={() => setExpandedCardIndex(isExpanded ? null : idx)}
                    className="p-3 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {data.report_date_as_yyyy_mm_dd || 'N/A'}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {data.commodity_name || 'N/A'}
                      </p>
                    </div>
                    <span className="text-gray-400 text-lg">
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expandable Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-2 border-t border-gray-200 space-y-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2">
                        Key Metrics
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {data.open_interest_all !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Open Interest:</span>
                            <span className="font-medium">
                              {data.open_interest_all.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.prod_merc_positions_long !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Prod/Merc Long:</span>
                            <span className="font-medium">
                              {data.prod_merc_positions_long.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.prod_merc_positions_short !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Prod/Merc Short:</span>
                            <span className="font-medium">
                              {data.prod_merc_positions_short.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.swap_positions_long_all !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Swap Long:</span>
                            <span className="font-medium">
                              {data.swap_positions_long_all.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.swap__positions_short_all !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Swap Short:</span>
                            <span className="font-medium">
                              {data.swap__positions_short_all.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.m_money_positions_long_all !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">M Money Long:</span>
                            <span className="font-medium">
                              {data.m_money_positions_long_all.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {data.m_money_positions_short_all !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">M Money Short:</span>
                            <span className="font-medium">
                              {data.m_money_positions_short_all.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Changes Section */}
                      {data.change_in_open_interest_all !== undefined && (
                        <>
                          <div className="text-xs font-semibold text-gray-700 mt-3 mb-2">
                            Changes
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">OI Change:</span>
                              <span
                                className={`font-medium ${
                                  (data.change_in_open_interest_all || 0) >= 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {(data.change_in_open_interest_all || 0) >= 0
                                  ? '+'
                                  : ''}
                                {data.change_in_open_interest_all.toLocaleString()}
                              </span>
                            </div>
                            {data.change_in_prod_merc_long !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Prod/Merc Long Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_prod_merc_long || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_prod_merc_long || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_prod_merc_long.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {data.change_in_prod_merc_short !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Prod/Merc Short Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_prod_merc_short || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_prod_merc_short || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_prod_merc_short.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {data.change_in_m_money_long_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">M Money Long Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_m_money_long_all || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_m_money_long_all || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_m_money_long_all.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {data.change_in_m_money_short_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">M Money Short Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_m_money_short_all || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_m_money_short_all || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_m_money_short_all.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {data.change_in_swap_long_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Swap Long Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_swap_long_all || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_swap_long_all || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_swap_long_all.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {data.change_in_swap_short_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Swap Short Δ:</span>
                                <span
                                  className={`font-medium ${
                                    (data.change_in_swap_short_all || 0) >= 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {(data.change_in_swap_short_all || 0) >= 0
                                    ? '+'
                                    : ''}
                                  {data.change_in_swap_short_all.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : !isLoading && (
        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600">
          No historical data. {startDate || endDate ? 'Try adjusting date filters.' : 'Select date filters and click "Load Data".'}
        </div>
      )}

      {/* Trend Section */}
      <div className="bg-gray-50 p-4 rounded-md space-y-4">
        <h3 className="font-semibold">Trend</h3>

        {/* Field Selector - Multi-select with checkboxes */}
        <div>
          <div
            onClick={() => setIsFieldSelectorExpanded(!isFieldSelectorExpanded)}
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2 px-2 mb-2"
          >
            <label className="block text-sm font-medium cursor-pointer">
              Select Fields for Chart (Multiple Selection)
            </label>
            <span className="text-gray-400 text-sm">
              {isFieldSelectorExpanded ? '▼' : '▶'}
            </span>
          </div>
          {isFieldSelectorExpanded && (
            <>
              <div className="bg-white border border-gray-300 rounded-md p-3 max-h-64 overflow-y-auto">
                {FIELD_CATEGORIES.map((category) => {
                  const isExpanded = expandedCategories.has(category.name)
                  return (
                    <div key={category.name} className="mb-4 last:mb-0">
                      <div
                        onClick={() => toggleCategory(category.name)}
                        className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-1 px-1 rounded"
                      >
                        <span>{category.name}</span>
                        <span className="text-gray-400 text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="space-y-1">
                          {category.fields.map((field) => {
                            const isSelected = selectedFields.includes(field)
                            const fieldDisplayName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                            return (
                              <label
                                key={field}
                                className="flex items-center p-1 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleFieldToggle(field)}
                                  className="mr-2"
                                />
                                <span className="text-sm">{fieldDisplayName}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedFields.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </>
          )}
        </div>

        {/* Price/Volume Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="priceVolume"
            checked={showPriceVolume}
            onChange={(e) => setShowPriceVolume(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="priceVolume" className="text-sm">
            Add Price/Volume
          </label>
        </div>

        {/* Trend Chart */}
        {selectedFields.length > 0 && (
          <div>
            {isTrendLoading ? (
              <div className="h-96 flex items-center justify-center bg-white rounded-md">
                <p>Loading chart data...</p>
              </div>
            ) : Object.keys(trendDataMap).length > 0 ? (
              <TrendChart
                trendDataMap={trendDataMap}
                commodityName={commodity}
                priceVolumeData={showPriceVolume ? priceVolumeData : []}
              />
            ) : (
              <div className="h-96 flex items-center justify-center bg-red-50 rounded-md text-red-800">
                No data available for selected fields
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

