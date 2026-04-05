'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getCotDataByCommodity,
  getCotDataByDateRange,
  getLatestCotData,
  getMultipleTrendData,
  getHistoricalPriceData,
  getCommoditySymbol,
  type CotDataPoint,
  type TrendDataPoint,
  type HistoricalPricePoint,
} from '@/lib/api'
import TrendChart from './TrendChart'
import NetPositionsChart from './NetPositionsChart'
import PositionsTable from './PositionsTable'
import ForecastSection from './ForecastSection'

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
    name: 'Non Reportables',
    fields: ['nonrept_positions_long_all', 'nonrept_positions_short_all'],
    meaning: 'Positions held by non-reportable traders (small traders not required to report).',
    whyItMatters:
      'Provides context on the broader market participation including smaller traders.',
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
      'change_in_nonrept_long_all',
      'change_in_nonrept_short_all',
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
      'pct_of_oi_nonrept_long_all',
      'pct_of_oi_nonrept_short_all',
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
      'traders_nonrept_long_all',
      'traders_nonrept_short_all',
    ],
    meaning: 'Indicates breadth of participation in the market.',
    whyItMatters:
      'If large positions come from very few traders, the signal may be weaker.',
  },
  {
    name: 'Net',
    fields: ['m_money_net', 'prod_merc_net', 'swap_net', 'other_rept_net', 'nonrept_net'],
    meaning: 'Net positions (long - short) for each trader category.',
    whyItMatters: 'Shows the overall positioning bias for each trader type.',
  },
]

const ALL_FIELDS = FIELD_CATEGORIES.flatMap((cat) => cat.fields)

// Helper function to format date as MMM DD
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Helper function to format date as MMM DD(Day) - for Daily Lens
const formatDailyLensDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[date.getDay()]
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}(${dayName})`
}

// Helper function to add/subtract days from a date
const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

// Helper function to get the Monday of the week for a given date
const getMondayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(date.setDate(diff))
  return monday.toISOString().split('T')[0]
}

// Helper function to get the Friday of the week for a given date
const getFridayOfWeek = (dateStr: string): string => {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() + (5 - day) // Friday is day 5
  const friday = new Date(date.setDate(diff))
  return friday.toISOString().split('T')[0]
}

// Helper function to calculate net positions
const calculateNetPositions = (data: CotDataPoint): CotDataPoint => {
  const updated = { ...data }
  updated.m_money_net = (data.m_money_positions_long_all || 0) - (data.m_money_positions_short_all || 0)
  updated.prod_merc_net = (data.prod_merc_positions_long || 0) - (data.prod_merc_positions_short || 0)
  updated.swap_net = (data.swap_positions_long_all || 0) - (data.swap__positions_short_all || 0)
  updated.other_rept_net = (data.other_rept_positions_long || 0) - (data.other_rept_positions_short || 0)
  updated.nonrept_net = (data.nonrept_positions_long_all || 0) - (data.nonrept_positions_short_all || 0)
  return updated
}

export default function ViewDataSection() {
  const [commodity, setCommodity] = useState('SILVER')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [latestData, setLatestData] = useState<CotDataPoint | null>(null)
  const [historicalData, setHistoricalData] = useState<CotDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Net Positions chart state
  const [showNetPositionsPrice, setShowNetPositionsPrice] = useState(false)
  const [netPositionsPriceData, setNetPositionsPriceData] = useState<HistoricalPricePoint[]>([])
  const [isNetPositionsExpanded, setIsNetPositionsExpanded] = useState(false)
  const [isPositionsTableExpanded, setIsPositionsTableExpanded] = useState(false)

  // Trend chart state
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [tempSelectedFields, setTempSelectedFields] = useState<string[]>([])
  const [trendDataMap, setTrendDataMap] = useState<Record<string, TrendDataPoint[]>>({})
  const [isTrendLoading, setIsTrendLoading] = useState(false)
  const [showPriceVolume, setShowPriceVolume] = useState(false)
  const [priceVolumeData, setPriceVolumeData] = useState<HistoricalPricePoint[]>([])
  const [expandedCardIndex, setExpandedCardIndex] = useState<number | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isFieldSelectorExpanded, setIsFieldSelectorExpanded] = useState(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Price change data state - keyed by report date
  const [priceChangeData, setPriceChangeData] = useState<Record<string, {
    previousWeek: { from: string; to: string; change: number; absChange: number } | null;
    currentWeekMTD: { from: string; to: string; change: number; absChange: number } | null;
    postReport: { from: string; to: string; change: number; absChange: number } | null;
    loading: boolean;
  }>>({})

  // Daily Lens state - tracks which report date has Daily Lens expanded
  const [expandedDailyLensDate, setExpandedDailyLensDate] = useState<string | null>(null)
  // Daily Lens data - keyed by report date
  const [dailyLensData, setDailyLensData] = useState<Record<string, { date: string; absChange: number; pctChange: number; volume: number | null }[]>>({})
  // Daily Lens loading state
  const [dailyLensLoading, setDailyLensLoading] = useState<Record<string, boolean>>({})

  // Function to fetch and calculate Daily Lens data
  const fetchDailyLensData = useCallback(async (reportDate: string, commodityName: string) => {
    // Toggle collapse if already expanded
    if (expandedDailyLensDate === reportDate) {
      setExpandedDailyLensDate(null)
      return
    }

    // Check if we already have data for this date
    if (dailyLensData[reportDate]) {
      setExpandedDailyLensDate(reportDate)
      return
    }

    // Set loading state
    setDailyLensLoading(prev => ({ ...prev, [reportDate]: true }))

    try {
      const symbol = getCommoditySymbol(commodityName)
      // Report date is typically a Tuesday
      const reportDateObj = new Date(reportDate)
      
      // Calculate start date: Previous week Wednesday (7 days before report date to ensure we get Wednesday data)
      // We go back 7 days to ensure we have data for the day before Wednesday for calculating Wednesday's change
      const startDate = addDays(reportDate, -7)
      
      // Calculate end date: Current week Friday (4 days after Tuesday report date to ensure we get Friday data)
      const endDate = addDays(reportDate, 4)
      
      // Fetch price data from previous week Wednesday to current week Friday
      const priceData = await getHistoricalPriceData(symbol, startDate, endDate, '1d')

      if (priceData.length === 0) {
        setDailyLensLoading(prev => ({ ...prev, [reportDate]: false }))
        return
      }

      // Calculate daily changes for each trading day
      // Each day's change = that day's close vs previous trading day's close
      const dailyChanges: { date: string; absChange: number; pctChange: number; volume: number | null }[] = []

      for (let i = 1; i < priceData.length; i++) {
        const prevDay = priceData[i - 1]
        const currDay = priceData[i]
        const prevClose = prevDay.close
        const currClose = currDay.close

        if (prevClose && currClose && prevClose !== 0) {
          const absChange = currClose - prevClose
          const pctChange = (absChange / prevClose) * 100
          dailyChanges.push({
            date: currDay.date,
            absChange,
            pctChange,
            volume: currDay.volume || null
          })
        }
      }

      setDailyLensData(prev => ({ ...prev, [reportDate]: dailyChanges }))
      setExpandedDailyLensDate(reportDate)
    } catch (error) {
      console.error('Error fetching Daily Lens data:', error)
    } finally {
      setDailyLensLoading(prev => ({ ...prev, [reportDate]: false }))
    }
  }, [dailyLensData, expandedDailyLensDate])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('Loading data for commodity:', commodity, 'startDate:', startDate, 'endDate:', endDate)

      // Always load latest
      let latest = await getLatestCotData(commodity)
      if (latest) {
        latest = calculateNetPositions(latest)
      }
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

      // Calculate net positions for historical data
      historical = historical.map(calculateNetPositions)

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

  const loadTrendData = useCallback(async (fieldsToUse?: string[]) => {
    const fields = fieldsToUse || selectedFields
    if (fields.length === 0) {
      setTrendDataMap({})
      return
    }

    setIsTrendLoading(true)
    try {
      // Separate regular fields from calculated net fields
      const regularFields: string[] = []
      const netFieldMap: Record<string, { long: string; short: string }> = {}

      fields.forEach(field => {
        if (field === 'm_money_net') {
          netFieldMap[field] = { long: 'm_money_positions_long_all', short: 'm_money_positions_short_all' }
        } else if (field === 'prod_merc_net') {
          netFieldMap[field] = { long: 'prod_merc_positions_long', short: 'prod_merc_positions_short' }
        } else if (field === 'swap_net') {
          netFieldMap[field] = { long: 'swap_positions_long_all', short: 'swap__positions_short_all' }
        } else if (field === 'other_rept_net') {
          netFieldMap[field] = { long: 'other_rept_positions_long', short: 'other_rept_positions_short' }
        } else if (field === 'nonrept_net') {
          netFieldMap[field] = { long: 'nonrept_positions_long_all', short: 'nonrept_positions_short_all' }
        } else {
          regularFields.push(field)
        }
      })

      // Fetch regular fields
      const fieldsToFetch = [...regularFields, ...Object.values(netFieldMap).flatMap(({ long, short }) => [long, short])]

      const response = await getMultipleTrendData(commodity, fieldsToFetch, 999)
      const newTrendDataMap: Record<string, TrendDataPoint[]> = {}

      // Process regular fields
      regularFields.forEach(field => {
        if (response.field_names.includes(field)) {
          newTrendDataMap[field] = response.data_points.map(dp => ({
            reportDate: dp.report_date,
            value: dp.values[field] || 0
          }))
        }
      })

      // Process calculated net fields
      Object.entries(netFieldMap).forEach(([netField, { long, short }]) => {
        const longData = response.field_names.includes(long) ? response.data_points.map(dp => ({
          reportDate: dp.report_date,
          value: dp.values[long] || 0
        })) : []

        const shortData = response.field_names.includes(short) ? response.data_points.map(dp => ({
          reportDate: dp.report_date,
          value: dp.values[short] || 0
        })) : []

        // Calculate net positions
        newTrendDataMap[netField] = longData.map((longPoint, index) => {
          const shortPoint = shortData[index]
          return {
            reportDate: longPoint.reportDate,
            value: (longPoint.value || 0) - (shortPoint?.value || 0)
          }
        })
      })

      setTrendDataMap(newTrendDataMap)

      // Load price/volume if enabled - use the earliest date from all fields
      if (showPriceVolume && Object.keys(newTrendDataMap).length > 0) {
        const allDates = Object.values(newTrendDataMap)
          .flatMap((data) => data.map((d) => d.reportDate))
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





  // Load price data for NetPositionsChart
  useEffect(() => {
    if (showNetPositionsPrice) {
      const symbol = getCommoditySymbol(commodity)
      // Load price data from the earliest COT report date to today
      // We'll use a reasonable start date since we don't have COT data dates yet
      const startDate = '2000-01-01' // Start from year 2000 for comprehensive data
      const endDate = new Date().toISOString().split('T')[0]

      getHistoricalPriceData(symbol, startDate, endDate, '1d')
        .then((data) => {
          setNetPositionsPriceData(data)
          if (data.length === 0) {
            console.warn('No price data received for NetPositionsChart. This might be due to rate limiting.')
          }
        })
        .catch((error) => {
          console.error('Failed to load price data for NetPositionsChart:', error)
          setNetPositionsPriceData([])
        })
    } else {
      setNetPositionsPriceData([])
    }
  }, [showNetPositionsPrice, commodity])

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
    setTempSelectedFields((prev) => {
      if (prev.includes(field)) {
        return prev.filter((f) => f !== field)
      } else {
        return [...prev, field]
      }
    })
  }

  const applySelectedFields = async () => {
    setSelectedFields(tempSelectedFields)
    await loadTrendData(tempSelectedFields)
  }

  const resetSelection = () => {
    setTempSelectedFields([])
    setSelectedFields([])
    setTrendDataMap({})
    setPriceVolumeData([])
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

  const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i])

  const shouldApply = selectedFields.length === 0 || !arraysEqual(tempSelectedFields, selectedFields)

  // Function to fetch and calculate price changes for a given report date
  const fetchPriceChanges = useCallback(async (reportDate: string, commodityName: string) => {
    // Check if we already have data for this date
    if (priceChangeData[reportDate]) {
      return
    }

    // Set loading state
    setPriceChangeData(prev => ({
      ...prev,
      [reportDate]: { previousWeek: null, currentWeekMTD: null, postReport: null, loading: true }
    }))

    try {
      const symbol = getCommoditySymbol(commodityName)

      // Calculate date ranges
      // Report date is typically a Tuesday
      const reportDateObj = new Date(reportDate)

      // 1. Previous Week: From previous Tuesday (7 days before) to report date
      const prevWeekStart = addDays(reportDate, -7)

      // 2. Current Week MTD: From Monday of current week to report date
      const mondayOfWeek = getMondayOfWeek(reportDate)

      // 3. Post Report: From report date to end of week Friday (report date + days until Friday)
      const fridayOfWeek = getFridayOfWeek(reportDate)
      
      // Extend the date range to include a few days after Friday to ensure we get Friday's close
      // The API might not have data for the exact Friday if it's a holiday
      const postReportEnd = addDays(fridayOfWeek, 3) // Add 3 extra days to ensure we get Friday's data

      // Fetch price data for all needed ranges
      // We need data from prevWeekStart to postReportEnd to cover all ranges
      const priceData = await getHistoricalPriceData(symbol, prevWeekStart, postReportEnd, '1d')
      if (priceData.length === 0) {
        setPriceChangeData(prev => ({
          ...prev,
          [reportDate]: { previousWeek: null, currentWeekMTD: null, postReport: null, loading: false }
        }))
        return
      }

      // Helper to find price on or before a specific date
      const findPriceOnOrBefore = (targetDate: string): number | null => {
        const target = new Date(targetDate)
        // Find the closest price on or before the target date
        for (let i = priceData.length - 1; i >= 0; i--) {
          const dataDate = new Date(priceData[i].date)
          if (dataDate <= target) {
            return priceData[i].close ?? null
          }
        }
        return null
      }

      // Helper to find price on or after a specific date
      const findPriceOnOrAfter = (targetDate: string): number | null => {
        const target = new Date(targetDate)
        for (let i = 0; i < priceData.length; i++) {
          const dataDate = new Date(priceData[i].date)
          if (dataDate >= target) {
            return priceData[i].close ?? null
          }
        }
        return null
      }

      // Helper to find the last price in the data (most recent)
      const findLastPrice = (): number | null => {
        if (priceData.length > 0) {
          return priceData[priceData.length - 1].close ?? null
        }
        return null
      }

      // Get prices for calculations
      const reportDatePrice = findPriceOnOrBefore(reportDate)
      const prevWeekPrice = findPriceOnOrBefore(prevWeekStart)
      // For current week MTD: Use Friday's close price (previous week's Friday before the report date)
      // If Friday is a holiday, it will use the previous trading day (Thursday)
      const previousFridayPrice = findPriceOnOrBefore(addDays(mondayOfWeek, -3)) // Friday before Monday of current week
      // For post-report: Use Friday of the same week as report date (end of week close)
      // If Friday is a holiday, it will use the previous trading day
      const postReportPrice = findPriceOnOrBefore(fridayOfWeek)

      // Calculate percentage and absolute changes
      const calcChange = (from: number | null, to: number | null): { pct: number; abs: number } | null => {
        if (from && to && from !== 0) {
          return { pct: ((to - from) / from) * 100, abs: to - from }
        }
        return null
      }

      const previousWeekChange = calcChange(prevWeekPrice, reportDatePrice)
      // Current week MTD: From previous Friday close to report date (labeled as Monday to report date)
      const currentWeekMTDChange = calcChange(previousFridayPrice, reportDatePrice)
      const postReportChange = calcChange(reportDatePrice, postReportPrice)

      // Calculate display dates for labels
      // previousWeek: Price change from Tuesday to Tuesday represents Wed-Tue changes
      const previousWeekFrom = addDays(prevWeekStart, 1) // Wednesday
      // postReport: Price change from Tuesday to Friday represents Wed-Fri changes
      const postReportFrom = addDays(reportDate, 1) // Wednesday

      setPriceChangeData(prev => ({
        ...prev,
        [reportDate]: {
          previousWeek: previousWeekChange !== null ? {
            from: formatDate(previousWeekFrom),
            to: formatDate(reportDate),
            change: previousWeekChange.pct,
            absChange: previousWeekChange.abs
          } : null,
          currentWeekMTD: currentWeekMTDChange !== null ? {
            // Label shows Monday date, but uses Friday's close price
            from: formatDate(mondayOfWeek),
            to: formatDate(reportDate),
            change: currentWeekMTDChange.pct,
            absChange: currentWeekMTDChange.abs
          } : null,
          postReport: postReportChange !== null ? {
            from: formatDate(postReportFrom),
            to: formatDate(fridayOfWeek),
            change: postReportChange.pct,
            absChange: postReportChange.abs
          } : null,
          loading: false
        }
      }))
    } catch (error) {
      console.error('Error fetching price changes:', error)
      setPriceChangeData(prev => ({
        ...prev,
        [reportDate]: { previousWeek: null, currentWeekMTD: null, postReport: null, loading: false }
      }))
    }
  }, [priceChangeData])

  // Effect to fetch price changes when latestData changes
  useEffect(() => {
    if (latestData?.report_date_as_yyyy_mm_dd) {
      fetchPriceChanges(latestData.report_date_as_yyyy_mm_dd, commodity)
    }
  }, [latestData, commodity, fetchPriceChanges])

  // Effect to clear price change data when commodity changes
  useEffect(() => {
    setPriceChangeData({})
  }, [commodity])

  // Effect to fetch price changes when a historical card is expanded
  useEffect(() => {
    if (expandedCardIndex !== null && historicalData[expandedCardIndex]) {
      const data = historicalData[expandedCardIndex]
      if (data?.report_date_as_yyyy_mm_dd && !priceChangeData[data.report_date_as_yyyy_mm_dd]) {
        fetchPriceChanges(data.report_date_as_yyyy_mm_dd, commodity)
      }
    }
  }, [expandedCardIndex, historicalData, commodity, priceChangeData, fetchPriceChanges])

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {latestData.open_interest_all !== undefined && (() => {
                const reportDate = latestData.report_date_as_yyyy_mm_dd
                const pcData = reportDate ? priceChangeData[reportDate] : undefined
                const isLoading = pcData?.loading ?? false
                return (
                  <div className="p-2 bg-white rounded border border-gray-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap flex items-center">
                        <span className="font-semibold">Open Interest:</span>
                        {latestData.change_in_open_interest_all !== undefined && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs font-semibold ${(latestData.change_in_open_interest_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_open_interest_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_open_interest_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                        {isLoading && (
                          <svg className="animate-spin ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.open_interest_all.toLocaleString()}
                        {latestData.change_in_open_interest_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_open_interest_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_open_interest_all || 0) >= 0 ? '+' : ''}{latestData.change_in_open_interest_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Price Change Metrics */}
                    {!isLoading && pcData && (
                      <div className="space-y-1 text-xs pt-1 border-t border-gray-100">
                        {pcData.previousWeek && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-nowrap">Price ({pcData.previousWeek.from} - {pcData.previousWeek.to}):</span>
                            <span className={`font-medium ${(pcData.previousWeek.change || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {((pcData.previousWeek.absChange || 0) >= 0 ? '+' : '')}{pcData.previousWeek.absChange.toFixed(2)} ({((pcData.previousWeek.change || 0) >= 0 ? '+' : '')}{pcData.previousWeek.change.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                        {pcData.currentWeekMTD && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-nowrap">Price ({pcData.currentWeekMTD.from} - {pcData.currentWeekMTD.to}):</span>
                            <span className={`font-medium ${(pcData.currentWeekMTD.change || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {((pcData.currentWeekMTD.absChange || 0) >= 0 ? '+' : '')}{pcData.currentWeekMTD.absChange.toFixed(2)} ({((pcData.currentWeekMTD.change || 0) >= 0 ? '+' : '')}{pcData.currentWeekMTD.change.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                        {pcData.postReport && (
                          <div className="flex justify-between">
                            <span className="text-gray-600 text-nowrap">Price ({pcData.postReport.from} - {pcData.postReport.to}):</span>
                            <span className={`font-medium ${(pcData.postReport.change || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {((pcData.postReport.absChange || 0) >= 0 ? '+' : '')}{pcData.postReport.absChange.toFixed(2)} ({((pcData.postReport.change || 0) >= 0 ? '+' : '')}{pcData.postReport.change.toFixed(2)}%)
                            </span>
                          </div>
                        )}
                        {/* Daily Lens Row */}
                        <div className="pt-1 border-t border-gray-100 mt-1">
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              if (reportDate) fetchDailyLensData(reportDate, commodity)
                            }}
                            className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                          >
                            <span className="text-gray-600 font-semibold text-nowrap">Daily Lens:</span>
                            <span className="text-gray-400 text-xs">
                              {expandedDailyLensDate === reportDate ? '▲' : '▶'}
                            </span>
                          </div>
                          {/* Daily Lens Popup */}
                          {expandedDailyLensDate === reportDate && (
                            <div className="mt-1 ml-2 space-y-1">
                              {dailyLensLoading[reportDate] ? (
                                <div className="text-xs text-gray-500 py-1">Loading...</div>
                              ) : dailyLensData[reportDate] ? (
                                dailyLensData[reportDate].map((day, idx) => (
                                  <div key={idx} className="text-xs flex justify-between items-center">
                                    <span className="text-gray-600">{formatDailyLensDate(day.date)}:</span>
                                    <span className={`font-medium ${(day.absChange || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                      {((day.absChange || 0) >= 0 ? '+' : '')}{day.absChange.toFixed(2)} ({(day.pctChange || 0) >= 0 ? '+' : ''}{day.pctChange.toFixed(2)}%)
                                    </span>
                                    {day.volume !== null && (
                                      <span className="text-gray-500 text-xs ml-2">
                                        Vol: {day.volume.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-xs text-gray-500 py-1">No data available</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {/* Prod/Merc Category */}
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Producer/Merchant</div>
                <div className="space-y-1 text-sm">
                  {latestData.prod_merc_positions_long !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Long:
                        {latestData.change_in_prod_merc_long !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_prod_merc_long || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_prod_merc_long || 0) >= 0 ? '+' : ''}{((latestData.change_in_prod_merc_long / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.prod_merc_positions_long.toLocaleString()}
                        {latestData.change_in_prod_merc_long !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_prod_merc_long || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_prod_merc_long || 0) >= 0 ? '+' : ''}{latestData.change_in_prod_merc_long.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {latestData.prod_merc_positions_short !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Short:
                        {latestData.change_in_prod_merc_short !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_prod_merc_short || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_prod_merc_short || 0) >= 0 ? '+' : ''}{((latestData.change_in_prod_merc_short / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.prod_merc_positions_short.toLocaleString()}
                        {latestData.change_in_prod_merc_short !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_prod_merc_short || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_prod_merc_short || 0) >= 0 ? '+' : ''}{latestData.change_in_prod_merc_short.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(latestData.prod_merc_positions_long !== undefined || latestData.prod_merc_positions_short !== undefined) && latestData.prod_merc_net !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                      <span className="text-gray-600 font-semibold text-nowrap">
                        Net:
                        {(() => {
                          const change = (latestData.change_in_prod_merc_long || 0) - (latestData.change_in_prod_merc_short || 0);
                          return change !== 0 && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                            <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {change >= 0 ? '+' : ''}{((change / latestData.open_interest_all) * 100).toFixed(2)}%
                            </span>
                          );
                        })()}
                      </span>
                      <span className="font-medium">
                        {latestData.prod_merc_net.toLocaleString()}
                        {(() => {
                          const change = (latestData.change_in_prod_merc_long || 0) - (latestData.change_in_prod_merc_short || 0);
                          return change !== 0 && (
                            <span className={`ml-1 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Swap Dealers Category */}
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Swap Dealers</div>
                <div className="space-y-1 text-sm">
                  {latestData.swap_positions_long_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Long:
                        {latestData.change_in_swap_long_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_swap_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_swap_long_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_swap_long_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.swap_positions_long_all.toLocaleString()}
                        {latestData.change_in_swap_long_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_swap_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_swap_long_all || 0) >= 0 ? '+' : ''}{latestData.change_in_swap_long_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {latestData.swap__positions_short_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Short:
                        {latestData.change_in_swap_short_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_swap_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_swap_short_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_swap_short_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.swap__positions_short_all.toLocaleString()}
                        {latestData.change_in_swap_short_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_swap_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_swap_short_all || 0) >= 0 ? '+' : ''}{latestData.change_in_swap_short_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(latestData.swap_positions_long_all !== undefined || latestData.swap__positions_short_all !== undefined) && latestData.swap_net !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                      <span className="text-gray-600 font-semibold text-nowrap">
                        Net:
                        {(() => {
                          const change = (latestData.change_in_swap_long_all || 0) - (latestData.change_in_swap_short_all || 0);
                          return change !== 0 && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                            <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {change >= 0 ? '+' : ''}{((change / latestData.open_interest_all) * 100).toFixed(2)}%
                            </span>
                          );
                        })()}
                      </span>
                      <span className="font-medium">
                        {latestData.swap_net.toLocaleString()}
                        {(() => {
                          const change = (latestData.change_in_swap_long_all || 0) - (latestData.change_in_swap_short_all || 0);
                          return change !== 0 && (
                            <span className={`ml-1 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Managed Money Category */}
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Managed Money</div>
                <div className="space-y-1 text-sm">
                  {latestData.m_money_positions_long_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Long:
                        {latestData.change_in_m_money_long_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_m_money_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_m_money_long_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_m_money_long_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.m_money_positions_long_all.toLocaleString()}
                        {latestData.change_in_m_money_long_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_m_money_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_m_money_long_all || 0) >= 0 ? '+' : ''}{latestData.change_in_m_money_long_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {latestData.m_money_positions_short_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Short:
                        {latestData.change_in_m_money_short_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_m_money_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_m_money_short_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_m_money_short_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.m_money_positions_short_all.toLocaleString()}
                        {latestData.change_in_m_money_short_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_m_money_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_m_money_short_all || 0) >= 0 ? '+' : ''}{latestData.change_in_m_money_short_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(latestData.m_money_positions_long_all !== undefined || latestData.m_money_positions_short_all !== undefined) && latestData.m_money_net !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                      <span className="text-gray-600 font-semibold text-nowrap">
                        Net:
                        {(() => {
                          const change = (latestData.change_in_m_money_long_all || 0) - (latestData.change_in_m_money_short_all || 0);
                          return change !== 0 && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                            <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {change >= 0 ? '+' : ''}{((change / latestData.open_interest_all) * 100).toFixed(2)}%
                            </span>
                          );
                        })()}
                      </span>
                      <span className="font-medium">
                        {latestData.m_money_net.toLocaleString()}
                        {(() => {
                          const change = (latestData.change_in_m_money_long_all || 0) - (latestData.change_in_m_money_short_all || 0);
                          return change !== 0 && (
                            <span className={`ml-1 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Other Reportables Category */}
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Other Reportables</div>
                <div className="space-y-1 text-sm">
                  {latestData.other_rept_positions_long !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Long:
                        {latestData.change_in_other_rept_long !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_other_rept_long || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_other_rept_long || 0) >= 0 ? '+' : ''}{((latestData.change_in_other_rept_long / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.other_rept_positions_long.toLocaleString()}
                        {latestData.change_in_other_rept_long !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_other_rept_long || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_other_rept_long || 0) >= 0 ? '+' : ''}{latestData.change_in_other_rept_long.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {latestData.other_rept_positions_short !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Short:
                        {latestData.change_in_other_rept_short !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_other_rept_short || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_other_rept_short || 0) >= 0 ? '+' : ''}{((latestData.change_in_other_rept_short / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.other_rept_positions_short.toLocaleString()}
                        {latestData.change_in_other_rept_short !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_other_rept_short || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_other_rept_short || 0) >= 0 ? '+' : ''}{latestData.change_in_other_rept_short.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(latestData.other_rept_positions_long !== undefined || latestData.other_rept_positions_short !== undefined) && latestData.other_rept_net !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                      <span className="text-gray-600 font-semibold text-nowrap">
                        Net:
                        {(() => {
                          const change = (latestData.change_in_other_rept_long || 0) - (latestData.change_in_other_rept_short || 0);
                          return change !== 0 && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                            <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {change >= 0 ? '+' : ''}{((change / latestData.open_interest_all) * 100).toFixed(2)}%
                            </span>
                          );
                        })()}
                      </span>
                      <span className="font-medium">
                        {latestData.other_rept_net.toLocaleString()}
                        {(() => {
                          const change = (latestData.change_in_other_rept_long || 0) - (latestData.change_in_other_rept_short || 0);
                          return change !== 0 && (
                            <span className={`ml-1 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {/* Non Reportables Category */}
              <div className="border border-gray-200 rounded p-2 bg-white">
                <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Non Reportables</div>
                <div className="space-y-1 text-sm">
                  {latestData.nonrept_positions_long_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Long:
                        {latestData.change_in_nonrept_long_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_nonrept_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_nonrept_long_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_nonrept_long_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.nonrept_positions_long_all.toLocaleString()}
                        {latestData.change_in_nonrept_long_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_nonrept_long_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_nonrept_long_all || 0) >= 0 ? '+' : ''}{latestData.change_in_nonrept_long_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {latestData.nonrept_positions_short_all !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap">
                        Short:
                        {latestData.change_in_nonrept_short_all !== undefined && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs ${(latestData.change_in_nonrept_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            {(latestData.change_in_nonrept_short_all || 0) >= 0 ? '+' : ''}{((latestData.change_in_nonrept_short_all / latestData.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                      </span>
                      <span className="font-medium">
                        {latestData.nonrept_positions_short_all.toLocaleString()}
                        {latestData.change_in_nonrept_short_all !== undefined && (
                          <span className={`ml-1 ${(latestData.change_in_nonrept_short_all || 0) >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                            }`}>
                            ({(latestData.change_in_nonrept_short_all || 0) >= 0 ? '+' : ''}{latestData.change_in_nonrept_short_all.toLocaleString()})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {(latestData.nonrept_positions_long_all !== undefined || latestData.nonrept_positions_short_all !== undefined) && latestData.nonrept_net !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                      <span className="text-gray-600 font-semibold text-nowrap">
                        Net:
                        {(() => {
                          const change = (latestData.change_in_nonrept_long_all || 0) - (latestData.change_in_nonrept_short_all || 0);
                          return change !== 0 && latestData.open_interest_all && latestData.open_interest_all !== 0 && (
                            <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {change >= 0 ? '+' : ''}{((change / latestData.open_interest_all) * 100).toFixed(2)}%
                            </span>
                          );
                        })()}
                      </span>
                      <span className="font-medium">
                        {latestData.nonrept_net.toLocaleString()}
                        {(() => {
                          const change = (latestData.change_in_nonrept_long_all || 0) - (latestData.change_in_nonrept_short_all || 0);
                          return change !== 0 && (
                            <span className={`ml-1 ${change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
                    <div className="px-3 pb-3 pt-2 border-t border-gray-200 space-y-3">
                      <div className="text-xs font-semibold text-gray-700 mb-2">
                        Key Metrics
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {data.open_interest_all !== undefined && (() => {
                          const reportDate = data.report_date_as_yyyy_mm_dd
                          const pcData = reportDate ? priceChangeData[reportDate] : undefined
                          const isLoading = pcData?.loading ?? false
                          return (
                            <div className="p-2 bg-white rounded border border-gray-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-nowrap flex items-center">
                        <span className="font-semibold">Open Interest:</span>
                        {data.change_in_open_interest_all !== undefined && data.open_interest_all !== 0 && (
                          <span className={`ml-1 text-xs font-semibold ${(data.change_in_open_interest_all || 0) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                            }`}>
                            {(data.change_in_open_interest_all || 0) >= 0 ? '+' : ''}{((data.change_in_open_interest_all / data.open_interest_all) * 100).toFixed(2)}%
                          </span>
                        )}
                        {isLoading && (
                                    <svg className="animate-spin ml-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.open_interest_all.toLocaleString()}
                                  {data.change_in_open_interest_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_open_interest_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_open_interest_all || 0) >= 0 ? '+' : ''}{data.change_in_open_interest_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                              {/* Price Change Metrics */}
                              {!isLoading && pcData && (
                                <div className="space-y-1 text-xs pt-1 border-t border-gray-100">
                                  {pcData.previousWeek && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 text-nowrap">Price ({pcData.previousWeek.from} - {pcData.previousWeek.to}):</span>
                                      <span className={`font-medium ${(pcData.previousWeek.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {((pcData.previousWeek.absChange || 0) >= 0 ? '+' : '')}{pcData.previousWeek.absChange.toFixed(2)} ({((pcData.previousWeek.change || 0) >= 0 ? '+' : '')}{pcData.previousWeek.change.toFixed(2)}%)
                                      </span>
                                    </div>
                                  )}
                                  {pcData.currentWeekMTD && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 text-nowrap">Price ({pcData.currentWeekMTD.from} - {pcData.currentWeekMTD.to}):</span>
                                      <span className={`font-medium ${(pcData.currentWeekMTD.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {((pcData.currentWeekMTD.absChange || 0) >= 0 ? '+' : '')}{pcData.currentWeekMTD.absChange.toFixed(2)} ({((pcData.currentWeekMTD.change || 0) >= 0 ? '+' : '')}{pcData.currentWeekMTD.change.toFixed(2)}%)
                                      </span>
                                    </div>
                                  )}
                                  {pcData.postReport && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600 text-nowrap">Price ({pcData.postReport.from} - {pcData.postReport.to}):</span>
                                      <span className={`font-medium ${(pcData.postReport.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {((pcData.postReport.absChange || 0) >= 0 ? '+' : '')}{pcData.postReport.absChange.toFixed(2)} ({((pcData.postReport.change || 0) >= 0 ? '+' : '')}{pcData.postReport.change.toFixed(2)}%)
                                      </span>
                                    </div>
                                  )}
                                  {/* Daily Lens Row */}
                                  <div className="pt-1 border-t border-gray-100 mt-1">
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (reportDate) fetchDailyLensData(reportDate, commodity)
                                      }}
                                      className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
                                    >
                                      <span className="text-gray-600 font-semibold text-nowrap">Daily Lens:</span>
                                      <span className="text-gray-400 text-xs">
                                        {expandedDailyLensDate === reportDate ? '▲' : '▶'}
                                      </span>
                                    </div>
                                    {/* Daily Lens Popup */}
                                    {expandedDailyLensDate === reportDate && (
                                      <div className="mt-1 ml-2 space-y-1">
                                        {dailyLensLoading[reportDate] ? (
                                          <div className="text-xs text-gray-500 py-1">Loading...</div>
                                        ) : dailyLensData[reportDate] ? (
                                          dailyLensData[reportDate].map((day, idx) => (
                                            <div key={idx} className="text-xs flex justify-between items-center">
                                              <span className="text-gray-600">{formatDailyLensDate(day.date)}:</span>
                                              <span className={`font-medium ${(day.absChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {((day.absChange || 0) >= 0 ? '+' : '')}{day.absChange.toFixed(2)} ({(day.pctChange || 0) >= 0 ? '+' : ''}{day.pctChange.toFixed(2)}%)
                                              </span>
                                              {day.volume !== null && (
                                                <span className="text-gray-500 text-xs ml-2">
                                                  Vol: {day.volume.toLocaleString()}
                                                </span>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          <div className="text-xs text-gray-500 py-1">No data available</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                        {/* Prod/Merc Category */}
                        <div className="border border-gray-200 rounded p-2 bg-white">
                          <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Producer/Merchant</div>
                          <div className="space-y-1 text-sm">
                            {data.prod_merc_positions_long !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Long:
                                  {data.change_in_prod_merc_long !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_prod_merc_long || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_prod_merc_long || 0) >= 0 ? '+' : ''}{((data.change_in_prod_merc_long / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.prod_merc_positions_long.toLocaleString()}
                                  {data.change_in_prod_merc_long !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_prod_merc_long || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_prod_merc_long || 0) >= 0 ? '+' : ''}{data.change_in_prod_merc_long.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {data.prod_merc_positions_short !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Short:
                                  {data.change_in_prod_merc_short !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_prod_merc_short || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_prod_merc_short || 0) >= 0 ? '+' : ''}{((data.change_in_prod_merc_short / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.prod_merc_positions_short.toLocaleString()}
                                  {data.change_in_prod_merc_short !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_prod_merc_short || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_prod_merc_short || 0) >= 0 ? '+' : ''}{data.change_in_prod_merc_short.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(data.prod_merc_positions_long !== undefined || data.prod_merc_positions_short !== undefined) && data.prod_merc_net !== undefined && (
                              <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-600 font-semibold text-nowrap">
                                  Net:
                                  {(() => {
                                    const change = (data.change_in_prod_merc_long || 0) - (data.change_in_prod_merc_short || 0);
                                    return change !== 0 && data.open_interest_all && data.open_interest_all !== 0 && (
                                      <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change >= 0 ? '+' : ''}{((change / data.open_interest_all) * 100).toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="font-medium">
                                  {data.prod_merc_net.toLocaleString()}
                                  {(() => {
                                    const change = (data.change_in_prod_merc_long || 0) - (data.change_in_prod_merc_short || 0);
                                    return change !== 0 && (
                                      <span className={`ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Swap Dealers Category */}
                        <div className="border border-gray-200 rounded p-2 bg-white">
                          <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Swap Dealers</div>
                          <div className="space-y-1 text-sm">
                            {data.swap_positions_long_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Long:
                                  {data.change_in_swap_long_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_swap_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_swap_long_all || 0) >= 0 ? '+' : ''}{((data.change_in_swap_long_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.swap_positions_long_all.toLocaleString()}
                                  {data.change_in_swap_long_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_swap_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_swap_long_all || 0) >= 0 ? '+' : ''}{data.change_in_swap_long_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {data.swap__positions_short_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Short:
                                  {data.change_in_swap_short_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_swap_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_swap_short_all || 0) >= 0 ? '+' : ''}{((data.change_in_swap_short_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.swap__positions_short_all.toLocaleString()}
                                  {data.change_in_swap_short_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_swap_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_swap_short_all || 0) >= 0 ? '+' : ''}{data.change_in_swap_short_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(data.swap_positions_long_all !== undefined || data.swap__positions_short_all !== undefined) && data.swap_net !== undefined && (
                              <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-600 font-semibold text-nowrap">
                                  Net:
                                  {(() => {
                                    const change = (data.change_in_swap_long_all || 0) - (data.change_in_swap_short_all || 0);
                                    return change !== 0 && data.open_interest_all && data.open_interest_all !== 0 && (
                                      <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change >= 0 ? '+' : ''}{((change / data.open_interest_all) * 100).toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="font-medium">
                                  {data.swap_net.toLocaleString()}
                                  {(() => {
                                    const change = (data.change_in_swap_long_all || 0) - (data.change_in_swap_short_all || 0);
                                    return change !== 0 && (
                                      <span className={`ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Managed Money Category */}
                        <div className="border border-gray-200 rounded p-2 bg-white">
                          <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Managed Money</div>
                          <div className="space-y-1 text-sm">
                            {data.m_money_positions_long_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Long:
                                  {data.change_in_m_money_long_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_m_money_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_m_money_long_all || 0) >= 0 ? '+' : ''}{((data.change_in_m_money_long_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.m_money_positions_long_all.toLocaleString()}
                                  {data.change_in_m_money_long_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_m_money_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_m_money_long_all || 0) >= 0 ? '+' : ''}{data.change_in_m_money_long_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {data.m_money_positions_short_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Short:
                                  {data.change_in_m_money_short_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_m_money_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_m_money_short_all || 0) >= 0 ? '+' : ''}{((data.change_in_m_money_short_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.m_money_positions_short_all.toLocaleString()}
                                  {data.change_in_m_money_short_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_m_money_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_m_money_short_all || 0) >= 0 ? '+' : ''}{data.change_in_m_money_short_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(data.m_money_positions_long_all !== undefined || data.m_money_positions_short_all !== undefined) && data.m_money_net !== undefined && (
                              <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-600 font-semibold text-nowrap">
                                  Net:
                                  {(() => {
                                    const change = (data.change_in_m_money_long_all || 0) - (data.change_in_m_money_short_all || 0);
                                    return change !== 0 && data.open_interest_all && data.open_interest_all !== 0 && (
                                      <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change >= 0 ? '+' : ''}{((change / data.open_interest_all) * 100).toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="font-medium">
                                  {data.m_money_net.toLocaleString()}
                                  {(() => {
                                    const change = (data.change_in_m_money_long_all || 0) - (data.change_in_m_money_short_all || 0);
                                    return change !== 0 && (
                                      <span className={`ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Other Reportables Category */}
                        <div className="border border-gray-200 rounded p-2 bg-white">
                          <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Other Reportables</div>
                          <div className="space-y-1 text-sm">
                            {data.other_rept_positions_long !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Long:
                                  {data.change_in_other_rept_long !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_other_rept_long || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_other_rept_long || 0) >= 0 ? '+' : ''}{((data.change_in_other_rept_long / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.other_rept_positions_long.toLocaleString()}
                                  {data.change_in_other_rept_long !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_other_rept_long || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_other_rept_long || 0) >= 0 ? '+' : ''}{data.change_in_other_rept_long.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {data.other_rept_positions_short !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Short:
                                  {data.change_in_other_rept_short !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_other_rept_short || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_other_rept_short || 0) >= 0 ? '+' : ''}{((data.change_in_other_rept_short / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.other_rept_positions_short.toLocaleString()}
                                  {data.change_in_other_rept_short !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_other_rept_short || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_other_rept_short || 0) >= 0 ? '+' : ''}{data.change_in_other_rept_short.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(data.other_rept_positions_long !== undefined || data.other_rept_positions_short !== undefined) && data.other_rept_net !== undefined && (
                              <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-600 font-semibold text-nowrap">
                                  Net:
                                  {(() => {
                                    const change = (data.change_in_other_rept_long || 0) - (data.change_in_other_rept_short || 0);
                                    return change !== 0 && data.open_interest_all && data.open_interest_all !== 0 && (
                                      <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change >= 0 ? '+' : ''}{((change / data.open_interest_all) * 100).toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="font-medium">
                                  {data.other_rept_net.toLocaleString()}
                                  {(() => {
                                    const change = (data.change_in_other_rept_long || 0) - (data.change_in_other_rept_short || 0);
                                    return change !== 0 && (
                                      <span className={`ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Non Reportables Category */}
                        <div className="border border-gray-200 rounded p-2 bg-white">
                          <div className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-100">Non Reportables</div>
                          <div className="space-y-1 text-sm">
                            {data.nonrept_positions_long_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Long:
                                  {data.change_in_nonrept_long_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_nonrept_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_nonrept_long_all || 0) >= 0 ? '+' : ''}{((data.change_in_nonrept_long_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.nonrept_positions_long_all.toLocaleString()}
                                  {data.change_in_nonrept_long_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_nonrept_long_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_nonrept_long_all || 0) >= 0 ? '+' : ''}{data.change_in_nonrept_long_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {data.nonrept_positions_short_all !== undefined && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 text-nowrap">
                                  Short:
                                  {data.change_in_nonrept_short_all !== undefined && data.open_interest_all && data.open_interest_all !== 0 && (
                                    <span className={`ml-1 text-xs ${(data.change_in_nonrept_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      {(data.change_in_nonrept_short_all || 0) >= 0 ? '+' : ''}{((data.change_in_nonrept_short_all / data.open_interest_all) * 100).toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-medium">
                                  {data.nonrept_positions_short_all.toLocaleString()}
                                  {data.change_in_nonrept_short_all !== undefined && (
                                    <span className={`ml-1 ${(data.change_in_nonrept_short_all || 0) >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                      }`}>
                                      ({(data.change_in_nonrept_short_all || 0) >= 0 ? '+' : ''}{data.change_in_nonrept_short_all.toLocaleString()})
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                            {(data.nonrept_positions_long_all !== undefined || data.nonrept_positions_short_all !== undefined) && data.nonrept_net !== undefined && (
                              <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
                                <span className="text-gray-600 font-semibold text-nowrap">
                                  Net:
                                  {(() => {
                                    const change = (data.change_in_nonrept_long_all || 0) - (data.change_in_nonrept_short_all || 0);
                                    return change !== 0 && data.open_interest_all && data.open_interest_all !== 0 && (
                                      <span className={`ml-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {change >= 0 ? '+' : ''}{((change / data.open_interest_all) * 100).toFixed(2)}%
                                      </span>
                                    );
                                  })()}
                                </span>
                                <span className="font-medium">
                                  {data.nonrept_net.toLocaleString()}
                                  {(() => {
                                    const change = (data.change_in_nonrept_long_all || 0) - (data.change_in_nonrept_short_all || 0);
                                    return change !== 0 && (
                                      <span className={`ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({change >= 0 ? '+' : ''}{change.toLocaleString()})
                                      </span>
                                    );
                                  })()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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

      {/* Net Positions Chart */}
      <div className="bg-gray-50 p-4 rounded-md space-y-4">
        <div
          onClick={() => setIsNetPositionsExpanded(!isNetPositionsExpanded)}
          className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2 px-2 -mt-2"
        >
          <h3 className="font-semibold">Net Positions</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="netPositionsPrice"
                checked={showNetPositionsPrice}
                onChange={(e) => setShowNetPositionsPrice(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mr-2"
              />
              <label htmlFor="netPositionsPrice" className="text-sm">
                Add Price
              </label>
            </div>
            <span className="text-gray-400 text-lg">
              {isNetPositionsExpanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
        {isNetPositionsExpanded && (
          <NetPositionsChart
            commodityName={commodity}
            showPrice={showNetPositionsPrice}
            priceData={netPositionsPriceData}
          />
        )}
      </div>

      {/* Positions Table */}
      <div className="bg-gray-50 p-4 rounded-md space-y-4">
        <div
          onClick={() => setIsPositionsTableExpanded(!isPositionsTableExpanded)}
          className="flex items-center justify-between cursor-pointer hover:bg-gray-100 p-2 rounded -mx-2 px-2 -mt-2"
        >
          <h3 className="font-semibold">Positions Table</h3>
          <span className="text-gray-400 text-lg">
            {isPositionsTableExpanded ? '▲' : '▼'}
          </span>
        </div>
        {isPositionsTableExpanded && (
          <PositionsTable commodityName={commodity} />
        )}
      </div>

      {/* Forecast Section */}
      <ForecastSection commodity={commodity} />

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
                            const isSelected = tempSelectedFields.includes(field)
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
              {tempSelectedFields.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  {tempSelectedFields.length} field{tempSelectedFields.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </>
          )}
        </div>

        {/* Apply/Reset Button */}
        {tempSelectedFields.length > 0 && (
          <button
            onClick={shouldApply ? applySelectedFields : resetSelection}
            disabled={isTrendLoading}
            className="w-full bg-gold-primary text-white py-2 px-4 rounded-md font-semibold hover:bg-gold-dark disabled:opacity-50"
          >
            {shouldApply ? (isTrendLoading ? 'Applying...' : 'Apply Selection') : 'Reset & Clear Chart'}
          </button>
        )}

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
