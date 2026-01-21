// API Configuration
const BASE_URL = 'https://finance-backend-ou68.onrender.com/api/v1'

// Helper to get headers with auth token
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  // Get token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  return headers
}

// Import logout function
import { logout } from './auth'

// Wrapper function to handle authenticated fetch requests
async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Add auth headers
  const headers = getHeaders()
  const authOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  }

  const response = await fetch(url, authOptions)

  // Check for unauthorized response
  if (response.status === 401) {
    logout()
    // Redirect to home page to show login modal
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
    throw new Error('Unauthorized - logged out')
  }

  return response
}

// Types
export interface CotDataPoint {
  commodity_name?: string
  report_date_as_yyyy_mm_dd?: string
  open_interest_all?: number
  prod_merc_positions_long?: number
  prod_merc_positions_short?: number
  swap_positions_long_all?: number
  swap__positions_short_all?: number
  m_money_positions_long_all?: number
  m_money_positions_short_all?: number
  other_rept_positions_long?: number
  other_rept_positions_short?: number
  nonrept_positions_long_all?: number
  nonrept_positions_short_all?: number
  change_in_open_interest_all?: number
  change_in_prod_merc_long?: number
  change_in_prod_merc_short?: number
  change_in_swap_long_all?: number
  change_in_swap_short_all?: number
  change_in_m_money_long_all?: number
  change_in_m_money_short_all?: number
  change_in_other_rept_long?: number
  change_in_other_rept_short?: number
  change_in_nonrept_long_all?: number
  change_in_nonrept_short_all?: number
  // Calculated net positions
  m_money_net?: number
  prod_merc_net?: number
  swap_net?: number
  other_rept_net?: number
  nonrept_net?: number
  [key: string]: any
}

export interface TrendDataPoint {
  reportDate: string
  value: number
}

export interface HistoricalPricePoint {
  date: string
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
}

export interface IngestResponse {
  commodity_name: string
  date_range?: {
    start: string
    end: string
  }
  duplicate_count: number
  inserted_count: number
  message: string
  total_fetched: number
}

// Commodity symbols
export const CommoditySymbols = {
  SILVER: 'SI=F',
  GOLD: 'GC=F',
  CRUDE: 'CL=F',
  COPPER: 'HG=F',
}

export function getCommoditySymbol(commodityName: string): string {
  const upper = commodityName.toUpperCase()
  switch (upper) {
    case 'SILVER':
      return CommoditySymbols.SILVER
    case 'GOLD':
      return CommoditySymbols.GOLD
    case 'CRUDE OIL':
    case 'CRUDE':
      return CommoditySymbols.CRUDE
    case 'COPPER':
      return CommoditySymbols.COPPER
    default:
      return CommoditySymbols.SILVER
  }
}

// API Functions
export async function ingestCotData(
  commodityName: string,
  startDate?: string,
  endDate?: string
): Promise<IngestResponse> {
  const params = new URLSearchParams()
  params.append('commodity_name', commodityName)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const response = await authenticatedFetch(`${BASE_URL}/cot/ingest?${params.toString()}`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Handle snake_case response format
  if (data.inserted_count !== undefined) {
    return {
      commodity_name: data.commodity_name || commodityName,
      date_range: data.date_range,
      duplicate_count: data.duplicate_count ?? 0,
      inserted_count: data.inserted_count ?? 0,
      message: data.message || `Successfully ingested ${data.inserted_count ?? 0} new records, skipped ${data.duplicate_count ?? 0} duplicates`,
      total_fetched: data.total_fetched ?? 0,
    }
  } else if (data.data && data.data.inserted_count !== undefined) {
    // Handle nested data format
    const nested = data.data
    return {
      commodity_name: nested.commodity_name || data.commodity_name || commodityName,
      date_range: nested.date_range || data.date_range,
      duplicate_count: nested.duplicate_count ?? 0,
      inserted_count: nested.inserted_count ?? 0,
      message: nested.message || data.message || `Successfully ingested ${nested.inserted_count ?? 0} new records, skipped ${nested.duplicate_count ?? 0} duplicates`,
      total_fetched: nested.total_fetched ?? 0,
    }
  } else {
    throw new Error('Unexpected response format: missing inserted_count field')
  }
}

export async function getCotDataByCommodity(
  commodityName: string
): Promise<CotDataPoint[]> {
  const encoded = encodeURIComponent(commodityName)
  const response = await authenticatedFetch(`${BASE_URL}/cot/commodity/${encoded}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch COT data: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Handle array or object response
  if (Array.isArray(data)) {
    return data
  } else if (data.data_points) {
    return data.data_points
  } else if (data.data) {
    return Array.isArray(data.data) ? data.data : []
  }
  
  return []
}

export async function getCotDataByDateRange(
  commodityName: string,
  startDate: string,
  endDate: string
): Promise<CotDataPoint[]> {
  const encoded = encodeURIComponent(commodityName)
  const params = new URLSearchParams()
  params.append('start_date', startDate)
  params.append('end_date', endDate)

  const response = await authenticatedFetch(
    `${BASE_URL}/cot/commodity/${encoded}/date-range?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch COT data: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('Date range COT data response:', data)
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data as CotDataPoint[]
  } else if (data.data_points && Array.isArray(data.data_points)) {
    return data.data_points as CotDataPoint[]
  } else if (data.data) {
    return Array.isArray(data.data) ? data.data as CotDataPoint[] : []
  }
  
  return []
}

export async function getLatestCotData(
  commodityName: string
): Promise<CotDataPoint | null> {
  const encoded = encodeURIComponent(commodityName)
  const response = await authenticatedFetch(`${BASE_URL}/cot/commodity/${encoded}/latest`)

  if (!response.ok) {
    throw new Error(`Failed to fetch latest COT data: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('Latest COT data response:', data)
  
  // Handle different response formats
  if (data.data && typeof data.data === 'object') {
    return data.data as CotDataPoint
  } else if (data.commodity_name || data.report_date_as_yyyy_mm_dd) {
    return data as CotDataPoint
  }
  
  return null
}

export interface MultipleTrendDataPoint {
  report_date: string
  values: Record<string, number>
}

export interface MultipleTrendResponse {
  commodity_name: string
  field_names: string[]
  data_points: MultipleTrendDataPoint[]
}

export async function getTrendData(
  commodityName: string,
  fieldName: string,
  limit: number = 999
): Promise<TrendDataPoint[]> {
  const encodedCommodity = encodeURIComponent(commodityName)
  const encodedField = encodeURIComponent(fieldName)
  const params = new URLSearchParams()
  params.append('limit', limit.toString())

  const response = await authenticatedFetch(
    `${BASE_URL}/cot/commodity/${encodedCommodity}/trend/${encodedField}?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch trend data: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('Trend data response:', data)

  // Handle different response formats
  let dataArray: any[] = []

  if (Array.isArray(data)) {
    // Direct array response
    dataArray = data
  } else if (data.data_points && Array.isArray(data.data_points)) {
    // Response with data_points field
    dataArray = data.data_points
  } else if (data.data && Array.isArray(data.data)) {
    // Response with data field
    dataArray = data.data
  } else {
    console.warn('Unexpected trend data format:', data)
    return []
  }

  // Map the data points to TrendDataPoint format
  console.log('Processing data array, length:', dataArray.length)
  if (dataArray.length > 0) {
    console.log('First data point sample:', dataArray[0])
  }

  const mapped = dataArray.map((item: any, index: number) => {
    // Try multiple field names for date
    const date = item.reportDate
      || item.report_date
      || item.report_date_as_yyyy_mm_dd
      || item.date
      || item.Date
      || ''

    // Try multiple field names for value
    const value = item.value !== undefined && item.value !== null
      ? item.value
      : (item[fieldName] !== undefined && item[fieldName] !== null)
      ? item[fieldName]
      : 0

    if (!date) {
      if (index < 3) { // Only log first few to avoid spam
        console.warn('Invalid trend data point (missing date):', item)
      }
      return null
    }

    const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0

    return {
      reportDate: String(date),
      value: numValue,
    }
  }).filter((item): item is TrendDataPoint => item !== null)

  console.log('Mapped trend data points:', mapped.length)
  return mapped
}

export async function getMultipleTrendData(
  commodityName: string,
  fieldNames: string[],
  limit: number = 999
): Promise<MultipleTrendResponse> {
  const encodedCommodity = encodeURIComponent(commodityName)
  const encodedFields = fieldNames.map(field => encodeURIComponent(field)).join(',')
  const params = new URLSearchParams()
  params.append('fields', encodedFields)
  params.append('limit', limit.toString())

  const response = await authenticatedFetch(
    `${BASE_URL}/cot/commodity/${encodedCommodity}/trends?${params.toString()}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch multiple trend data: ${response.statusText}`)
  }

  const data = await response.json()
  console.log('Multiple trend data response:', data)

  return data as MultipleTrendResponse
}

// Forecast API Types
export interface ForecastDashboard {
  generated_at: string
  signal_1_model_bias: {
    direction: string
    confidence: string
    horizon: string
    prob_up: number
    prob_down: number
    prob_flat: number
    description: string
    name: string
  }
  signal_2_regime: {
    regime: string
    reason: string
    mm_trapped: string
    mm_z: number
    divergence_z: number
    description: string
    name: string
  }
  signal_3_mm_gauge: {
    positioning: string
    z_score: number
    percentile: number
    net_pct: number
    interpretation: string
    description: string
    name: string
  }
  signal_4_producer_divergence: {
    level: string
    z_score: number
    direction: string
    change: string
    divergence_change: number
    interpretation: string
    description: string
    name: string
  }
  signal_5_price_context: {
    price_state: string
    trend_4w: number
    trend_12w: number
    vol_state: string
    vol_z: number
    vol_4w: number
    vol_interpretation: string
    description: string
    name: string
  }
  signal_6_trade_readiness: {
    score: number
    max_score: number
    level: string
    action: string
    factors: string[]
    description: string
    name: string
  }
  signal_7_suggested_action: {
    title: string
    bias: string
    regime: string
    guidance: string
    risk_level: string
    readiness: string
    context: string
    description: string
    name: string
  }
  quick_summary: {
    direction: string
    confidence: string
    regime: string
    trade_readiness: string
    action: string
  }
  prediction: {
    direction: string
    probabilities: {
      down: number
      up: number
    }
  }
  data_info: {
    cot_report_date: string
    price_date: string
    commodity: string
  }
}

export interface ForecastSignal {
  direction: string
  confidence: string
  regime: string
  trade_readiness: string
  action: string
}

export interface ForecastFeatures {
  features: Record<string, number>
  interpretations: {
    model_probability_up: number
    trade_signal: string
    regime: {
      trend: string
      volatility: string
      participation: string
    }
    managed_money: {
      direction: string
      crowding: string
      momentum: string
    }
    producer: {
      positioning: string
      stress: string
      momentum: string
    }
    divergence: {
      level: string
      direction: string
    }
    execution: {
      bias: string
      action: string
      position_size_multiplier: number
    }
    narrative: string
  }
  model_prediction: {
    direction: string
    probabilities: {
      down: number
      up: number
    }
  }
  report_date: string
}

// Forecast API Functions
export async function getForecastDashboard(commodity: string): Promise<ForecastDashboard> {
  const encoded = encodeURIComponent(commodity)
  const response = await authenticatedFetch(`${BASE_URL}/forecast/${encoded}/dashboard`)

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast dashboard: ${response.statusText}`)
  }

  return response.json()
}

export async function getForecastSignal(commodity: string): Promise<ForecastSignal> {
  const encoded = encodeURIComponent(commodity)
  const response = await authenticatedFetch(`${BASE_URL}/forecast/${encoded}/signal`)

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast signal: ${response.statusText}`)
  }

  return response.json()
}

export async function getForecastFeatures(commodity: string): Promise<ForecastFeatures> {
  const encoded = encodeURIComponent(commodity)
  const response = await authenticatedFetch(`${BASE_URL}/forecast/${encoded}/features`)

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast features: ${response.statusText}`)
  }

  return response.json()
}

export async function getHistoricalPriceData(
  symbol: string,
  startDate?: string,
  endDate?: string,
  interval: string = '1d'
): Promise<HistoricalPricePoint[]> {
  const encoded = encodeURIComponent(symbol)
  const params = new URLSearchParams()
  params.append('interval', interval)
  // Try both parameter name formats
  if (startDate) {
    params.append('start_date', startDate)
    params.append('start', startDate) // Try both
  }
  if (endDate) {
    params.append('end_date', endDate)
    params.append('end', endDate) // Try both
  }

  try {
    const response = await authenticatedFetch(
      `https://finance-backend-ou68.onrender.com/api/v1/prices/historical/${encoded}?${params.toString()}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail || errorData.message || response.statusText
      
      // Handle rate limiting gracefully
      if (response.status === 400 && errorMessage.includes('Rate limited')) {
        console.warn('Price data API rate limited, skipping price/volume overlay')
        return []
      }
      
      throw new Error(`Failed to fetch price data: ${errorMessage}`)
    }

    const data = await response.json()
    console.log('Historical price data response:', data)
    
    if (data.data && Array.isArray(data.data)) {
      // Helper to normalize date to YYYY-MM-DD format
      const normalizeDate = (dateValue: any): string => {
        if (!dateValue) return ''
        
        // If it's already a string in YYYY-MM-DD format
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          return dateValue
        }
        
        // If it's a timestamp (number)
        if (typeof dateValue === 'number') {
          const date = new Date(dateValue)
          return date.toISOString().split('T')[0]
        }
        
        // Try to parse as date string
        if (typeof dateValue === 'string') {
          const date = new Date(dateValue)
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0]
          }
        }
        
        return String(dateValue)
      }
      
      return data.data.map((item: any) => {
        const rawDate = item.date || item.Date || item.timestamp
        return {
          date: normalizeDate(rawDate),
          open: item.open || item.Open,
          high: item.high || item.High,
          low: item.low || item.Low,
          close: item.close || item.Close,
          volume: item.volume || item.Volume,
        }
      })
    }
    
    return []
  } catch (error: any) {
    console.error('Error fetching historical price data:', error)
    // Return empty array instead of throwing to prevent UI breakage
    return []
  }
}










