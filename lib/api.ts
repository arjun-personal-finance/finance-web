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
  change_in_open_interest_all?: number
  change_in_prod_merc_long?: number
  change_in_prod_merc_short?: number
  change_in_swap_long_all?: number
  change_in_swap_short_all?: number
  change_in_m_money_long_all?: number
  change_in_m_money_short_all?: number
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
  insertedCount: number
  duplicateCount: number
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

  const response = await fetch(`${BASE_URL}/cot/ingest?${params.toString()}`, {
    method: 'POST',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Handle different response formats
  if (data.insertedCount !== undefined) {
    return {
      insertedCount: data.insertedCount,
      duplicateCount: data.duplicateCount || 0,
    }
  } else if (data.data) {
    return {
      insertedCount: data.data.insertedCount || 0,
      duplicateCount: data.data.duplicateCount || 0,
    }
  } else {
    throw new Error('Unexpected response format')
  }
}

export async function getCotDataByCommodity(
  commodityName: string
): Promise<CotDataPoint[]> {
  const encoded = encodeURIComponent(commodityName)
  const response = await fetch(`${BASE_URL}/cot/commodity/${encoded}`, {
    headers: getHeaders(),
  })

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

  const response = await fetch(
    `${BASE_URL}/cot/commodity/${encoded}/date-range?${params.toString()}`,
    {
      headers: getHeaders(),
    }
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
  const response = await fetch(`${BASE_URL}/cot/commodity/${encoded}/latest`, {
    headers: getHeaders(),
  })

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

export async function getTrendData(
  commodityName: string,
  fieldName: string,
  limit: number = 999
): Promise<TrendDataPoint[]> {
  const encodedCommodity = encodeURIComponent(commodityName)
  const encodedField = encodeURIComponent(fieldName)
  const params = new URLSearchParams()
  params.append('limit', limit.toString())

  const response = await fetch(
    `${BASE_URL}/cot/commodity/${encodedCommodity}/trend/${encodedField}?${params.toString()}`,
    {
      headers: getHeaders(),
    }
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
    const response = await fetch(
      `https://finance-backend-ou68.onrender.com/api/v1/prices/historical/${encoded}?${params.toString()}`,
      {
        headers: getHeaders(),
      }
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

