'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  PaginationState,
} from '@tanstack/react-table'
import { getMultipleTrendData, type MultipleTrendDataPoint } from '@/lib/api'
import * as XLSX from 'xlsx'

// Types
interface PositionsTableProps {
  commodityName: string
}

interface TableRowData extends MultipleTrendDataPoint {
  // Add calculated fields
  prodMercNet: number
  mMoneyNet: number
  swapNet: number
  otherReptNet: number
  nonreptNet: number
  prodMercPctOiLong: number
  prodMercPctOiShort: number
  mMoneyPctOiLong: number
  mMoneyPctOiShort: number
  swapPctOiLong: number
  swapPctOiShort: number
  otherReptPctOiLong: number
  otherReptPctOiShort: number
  nonreptPctOiLong: number
  nonreptPctOiShort: number
  mMoneyPctOiSpread: number
  swapPctOiSpread: number
  otherReptPctOiSpread: number
}

export default function PositionsTable({ commodityName }: PositionsTableProps) {
  const [weeks, setWeeks] = useState(26) // Default to ~6 months
  const [data, setData] = useState<TableRowData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'report_date', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  })

  // Track the input value separately from the actual weeks used for fetching
  const [weeksInput, setWeeksInput] = useState(26)

  // Store min/max ranges for each column
  const [columnRanges, setColumnRanges] = useState<Record<string, { min: number; max: number }>>({})

  // Define required fields for the table - exclude date field since API can't handle it
  const requiredFields = [
    'open_interest_all',
    // Producer/Merchant
    'prod_merc_positions_long',
    'prod_merc_positions_short',
    'change_in_prod_merc_long',
    'change_in_prod_merc_short',
    // Managed Money
    'm_money_positions_long_all',
    'm_money_positions_short_all',
    'change_in_m_money_long_all',
    'change_in_m_money_short_all',
    'm_money_positions_spread',
    // Swaps
    'swap_positions_long_all',
    'swap__positions_short_all',
    'change_in_swap_long_all',
    'change_in_swap_short_all',
    'swap__positions_spread_all',
    // Other Reportables
    'other_rept_positions_long',
    'other_rept_positions_short',
    'change_in_other_rept_long',
    'change_in_other_rept_short',
    'other_rept_positions_spread',
    // Non Reportables
    'nonrept_positions_long_all',
    'nonrept_positions_short_all',
    'change_in_nonrept_long_all',
    'change_in_nonrept_short_all',
  ]

  // Fetch data function
  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use getMultipleTrendData like NetPositionsChart does
      const response = await getMultipleTrendData(commodityName, requiredFields, 999)

      // Debug: Log the response structure (removed for production)

      // Calculate how many weeks back we want (weeks * 7 days)
      const weeksInMs = weeks * 7 * 24 * 60 * 60 * 1000
      const cutoffDate = new Date(Date.now() - weeksInMs)

      // Filter data to only include records within the specified weeks
      const filteredData = response.data_points.filter((point) => {
        if (!point.report_date) return false
        const reportDate = new Date(point.report_date)
        return reportDate >= cutoffDate
      })

      console.log('PositionsTable - Filtered to', filteredData.length, 'records within', weeks, 'weeks')

      // Transform and calculate derived fields
      const transformedData: TableRowData[] = filteredData.map((point, index) => {
        const values = point.values
        const oi = values.open_interest_all || 1 // Avoid division by zero

        const transformed: TableRowData = {
          ...point,
          // Calculated net positions
          prodMercNet: (values.prod_merc_positions_long || 0) - (values.prod_merc_positions_short || 0),
          mMoneyNet: (values.m_money_positions_long_all || 0) - (values.m_money_positions_short_all || 0),
          swapNet: (values.swap_positions_long_all || 0) - (values.swap__positions_short_all || 0),
          otherReptNet: (values.other_rept_positions_long || 0) - (values.other_rept_positions_short || 0),
          nonreptNet: (values.nonrept_positions_long_all || 0) - (values.nonrept_positions_short_all || 0),
          // Calculated %OI values
          prodMercPctOiLong: ((values.prod_merc_positions_long || 0) * 100) / oi,
          prodMercPctOiShort: ((values.prod_merc_positions_short || 0) * 100) / oi,
          mMoneyPctOiLong: ((values.m_money_positions_long_all || 0) * 100) / oi,
          mMoneyPctOiShort: ((values.m_money_positions_short_all || 0) * 100) / oi,
          swapPctOiLong: ((values.swap_positions_long_all || 0) * 100) / oi,
          swapPctOiShort: ((values.swap__positions_short_all || 0) * 100) / oi,
          otherReptPctOiLong: ((values.other_rept_positions_long || 0) * 100) / oi,
          otherReptPctOiShort: ((values.other_rept_positions_short || 0) * 100) / oi,
          nonreptPctOiLong: ((values.nonrept_positions_long_all || 0) * 100) / oi,
          nonreptPctOiShort: ((values.nonrept_positions_short_all || 0) * 100) / oi,
          mMoneyPctOiSpread: ((values.m_money_positions_spread || 0) * 100) / oi,
          swapPctOiSpread: ((values.swap__positions_spread_all || 0) * 100) / oi,
          otherReptPctOiSpread: ((values.other_rept_positions_spread || 0) * 100) / oi,
        }

        // Debug: Log first few transformed points
        if (index < 3) {
          console.log('PositionsTable - Transformed point:', transformed)
        }

        return transformed
      })

      // Sort by report date descending
      transformedData.sort((a, b) => {
        const dateA = new Date(a.report_date || '')
        const dateB = new Date(b.report_date || '')
        return dateB.getTime() - dateA.getTime()
      })

      console.log('PositionsTable - Final transformed data:', transformedData.length, 'records')
      console.log('PositionsTable - Setting data state:', transformedData)

      setData(transformedData)

      // Calculate column ranges for color grading
      const ranges: Record<string, { min: number; max: number }> = {}

      // Define columns that need range-based coloring
      const colorColumns = [
        'openInterest', // Add Open Interest with blue gradient
        'prodMerc_long', 'prodMerc_short', 'prodMerc_changeLong', 'prodMerc_changeShort', 'prodMercNet',
        'mMoney_long', 'mMoney_short', 'mMoney_changeLong', 'mMoney_changeShort', 'mMoneyNet',
        'swaps_long', 'swaps_short', 'swaps_changeLong', 'swaps_changeShort', 'swapNet',
        'otherRept_long', 'otherRept_short', 'otherRept_changeLong', 'otherRept_changeShort', 'otherReptNet',
        'nonrept_long', 'nonrept_short', 'nonrept_changeLong', 'nonrept_changeShort', 'nonreptNet'
      ]

      colorColumns.forEach(columnId => {
        const values: number[] = []

        transformedData.forEach(row => {
          let value = 0

          // Extract value based on column ID
          switch (columnId) {
            case 'openInterest':
              value = row.values.open_interest_all || 0
              break
            case 'prodMerc_long':
              value = row.values.prod_merc_positions_long || 0
              break
            case 'prodMerc_short':
              value = row.values.prod_merc_positions_short || 0
              break
            case 'prodMerc_changeLong':
              value = row.values.change_in_prod_merc_long || 0
              break
            case 'prodMerc_changeShort':
              value = row.values.change_in_prod_merc_short || 0
              break
            case 'prodMercNet':
              value = row.prodMercNet || 0
              break
            case 'mMoney_long':
              value = row.values.m_money_positions_long_all || 0
              break
            case 'mMoney_short':
              value = row.values.m_money_positions_short_all || 0
              break
            case 'mMoney_changeLong':
              value = row.values.change_in_m_money_long_all || 0
              break
            case 'mMoney_changeShort':
              value = row.values.change_in_m_money_short_all || 0
              break
            case 'mMoneyNet':
              value = row.mMoneyNet || 0
              break
            case 'swaps_long':
              value = row.values.swap_positions_long_all || 0
              break
            case 'swaps_short':
              value = row.values.swap__positions_short_all || 0
              break
            case 'swaps_changeLong':
              value = row.values.change_in_swap_long_all || 0
              break
            case 'swaps_changeShort':
              value = row.values.change_in_swap_short_all || 0
              break
            case 'swapNet':
              value = row.swapNet || 0
              break
            case 'otherRept_long':
              value = row.values.other_rept_positions_long || 0
              break
            case 'otherRept_short':
              value = row.values.other_rept_positions_short || 0
              break
            case 'otherRept_changeLong':
              value = row.values.change_in_other_rept_long || 0
              break
            case 'otherRept_changeShort':
              value = row.values.change_in_other_rept_short || 0
              break
            case 'otherReptNet':
              value = row.otherReptNet || 0
              break
            case 'nonrept_long':
              value = row.values.nonrept_positions_long_all || 0
              break
            case 'nonrept_short':
              value = row.values.nonrept_positions_short_all || 0
              break
            case 'nonrept_changeLong':
              value = row.values.change_in_nonrept_long_all || 0
              break
            case 'nonrept_changeShort':
              value = row.values.change_in_nonrept_short_all || 0
              break
            case 'nonreptNet':
              value = row.nonreptNet || 0
              break
          }

          values.push(value)
        })

        if (values.length > 0) {
          ranges[columnId] = {
            min: Math.min(...values),
            max: Math.max(...values)
          }
        }
      })

      console.log('Calculated column ranges:', ranges)
      setColumnRanges(ranges)
    } catch (err: any) {
      console.error('Failed to load positions data:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on component mount and when weeks changes
  useEffect(() => {
    fetchData()
  }, [commodityName, weeks])

  // Handle submit button click
  const handleSubmit = () => {
    setWeeks(weeksInput)
  }

  // Export to XLSX function
  const exportToXLSX = () => {
    if (data.length === 0) return

    // Flatten the data structure for export
    const exportData = data.map(row => ({
      'Report Date': new Date(row.report_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      'Open Interest': row.values.open_interest_all || 0,

      // Producer/Merchant
      'Prod/Merc Long Position': row.values.prod_merc_positions_long || 0,
      'Prod/Merc Short Position': row.values.prod_merc_positions_short || 0,
      'Prod/Merc Change Long': row.values.change_in_prod_merc_long || 0,
      'Prod/Merc Change Short': row.values.change_in_prod_merc_short || 0,
      'Prod/Merc Net Position': row.prodMercNet || 0,
      'Prod/Merc %OI Long': row.prodMercPctOiLong?.toFixed(2) || 0,
      'Prod/Merc %OI Short': row.prodMercPctOiShort?.toFixed(2) || 0,

      // Managed Money
      'Managed Money Long Position': row.values.m_money_positions_long_all || 0,
      'Managed Money Short Position': row.values.m_money_positions_short_all || 0,
      'Managed Money Change Long': row.values.change_in_m_money_long_all || 0,
      'Managed Money Change Short': row.values.change_in_m_money_short_all || 0,
      'Managed Money Spread': row.values.m_money_positions_spread || 0,
      'Managed Money Net Position': row.mMoneyNet || 0,
      'Managed Money %OI Long': row.mMoneyPctOiLong?.toFixed(2) || 0,
      'Managed Money %OI Short': row.mMoneyPctOiShort?.toFixed(2) || 0,
      'Managed Money %OI Spread': row.mMoneyPctOiSpread?.toFixed(2) || 0,

      // Swaps
      'Swaps Long Position': row.values.swap_positions_long_all || 0,
      'Swaps Short Position': row.values.swap__positions_short_all || 0,
      'Swaps Change Long': row.values.change_in_swap_long_all || 0,
      'Swaps Change Short': row.values.change_in_swap_short_all || 0,
      'Swaps Spread': row.values.swap__positions_spread_all || 0,
      'Swaps Net Position': row.swapNet || 0,
      'Swaps %OI Long': row.swapPctOiLong?.toFixed(2) || 0,
      'Swaps %OI Short': row.swapPctOiShort?.toFixed(2) || 0,
      'Swaps %OI Spread': row.swapPctOiSpread?.toFixed(2) || 0,

      // Other Reportables
      'Other Reportables Long Position': row.values.other_rept_positions_long || 0,
      'Other Reportables Short Position': row.values.other_rept_positions_short || 0,
      'Other Reportables Change Long': row.values.change_in_other_rept_long || 0,
      'Other Reportables Change Short': row.values.change_in_other_rept_short || 0,
      'Other Reportables Spread': row.values.other_rept_positions_spread || 0,
      'Other Reportables Net Position': row.otherReptNet || 0,
      'Other Reportables %OI Long': row.otherReptPctOiLong?.toFixed(2) || 0,
      'Other Reportables %OI Short': row.otherReptPctOiShort?.toFixed(2) || 0,
      'Other Reportables %OI Spread': row.otherReptPctOiSpread?.toFixed(2) || 0,

      // Non Reportables
      'Non Reportables Long Position': row.values.nonrept_positions_long_all || 0,
      'Non Reportables Short Position': row.values.nonrept_positions_short_all || 0,
      'Non Reportables Change Long': row.values.change_in_nonrept_long_all || 0,
      'Non Reportables Change Short': row.values.change_in_nonrept_short_all || 0,
      'Non Reportables Net Position': row.nonreptNet || 0,
      'Non Reportables %OI Long': row.nonreptPctOiLong?.toFixed(2) || 0,
      'Non Reportables %OI Short': row.nonreptPctOiShort?.toFixed(2) || 0,
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Auto-size columns
    const colWidths = Object.keys(exportData[0]).map(key => ({
      wch: Math.max(key.length, 15) // Minimum width of 15, or header length
    }))
    ws['!cols'] = colWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, `${commodityName} Positions`)

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${commodityName}_positions_${dateStr}.xlsx`

    // Save file
    XLSX.writeFile(wb, filename)
  }

  // Helper functions for color coding
  const getValueColor = (value: number, type: 'net' | 'long' | 'short', columnId?: string): { className: string; style?: React.CSSProperties } => {
    if (value === 0) return { className: 'bg-gray-50' }

    // Special handling for Open Interest - use ONLY blue colors
    if (columnId === 'openInterest' || columnId === 'openinterest') {
      if (columnRanges[columnId]) {
        const { min, max } = columnRanges[columnId]
        const range = max - min

        if (range === 0) return { className: 'bg-gray-50' } // All values are the same

        // Calculate relative position (0 to 1) within the column's range
        const relativePosition = Math.max(0, Math.min(1, (value - min) / range))
        const intensity = Math.floor(relativePosition * 4) // 0-4 scale

        // Blue gradient for Open Interest (always positive direction)
        const blueColors = [
          'rgb(219, 234, 254)', // Very light blue
          'rgb(191, 219, 254)', // Light blue
          'rgb(147, 197, 253)', // Medium light blue
          'rgb(96, 165, 250)',  // Medium blue
          'rgb(59, 130, 246)'   // Blue
        ]
        return { className: '', style: { backgroundColor: blueColors[intensity] } }
      }
      return { className: '', style: { backgroundColor: 'rgb(147, 197, 253)' } } // Default blue if no range data
    }

    // Comprehensive color spectrum from strong bearish to strong bullish
    const fullSpectrum = [
      '#E85C5C', // Strong Red (strongest bearish)
      '#F06A6A', // Lighter red
      '#F28B82', // Light Red
      '#F6C177', // Light Orange
      '#FFD700', // Gold
      '#FFF1C1', // Very light yellow/gold
      '#EAF7E6', // Very light green
      '#B7E4C7', // Light green
      '#95D5B2', // Medium light green
      '#52B788'  // Medium green (strongest bullish)
    ]

    // If we have column ranges, use relative positioning
    if (columnId && columnRanges[columnId]) {
      const { min, max } = columnRanges[columnId]
      const range = max - min

      if (range === 0) return { className: 'bg-gray-50' } // All values are the same

      // Calculate relative position (0 to 1) within the column's range
      const relativePosition = Math.max(0, Math.min(1, (value - min) / range))
      const intensity = Math.floor(relativePosition * 9) // 0-9 scale for 10 colors

      if (type === 'net' || type === 'long') {
        // Bullish direction: higher values = more bullish colors
        return { className: '', style: { backgroundColor: fullSpectrum[intensity] } }
      } else {
        // Bearish direction: higher values = more bearish colors (reverse spectrum)
        return { className: '', style: { backgroundColor: fullSpectrum[9 - intensity] } }
      }
    }

    // Fallback to absolute ranges if no column ranges available
    const absValue = Math.abs(value)
    let intensity = 0

    // Define intensity levels based on value ranges
    if (absValue >= 100000) intensity = 4 // Darkest
    else if (absValue >= 50000) intensity = 3
    else if (absValue >= 25000) intensity = 2
    else if (absValue >= 10000) intensity = 1
    else intensity = 0 // Lightest

    if (type === 'net' || type === 'long') {
      // Green for positive, red for negative
      if (value > 0) {
        return { className: '', style: { backgroundColor: `rgb(${34 + intensity * 44}, ${197 + intensity * 26}, ${94 + intensity * 42})` } }
      } else {
        return { className: '', style: { backgroundColor: `rgb(${239 - intensity * 15}, ${68 - intensity * 2}, ${68 - intensity * 2})` } }
      }
    } else {
      // Opposite for short positions
      if (value > 0) {
        return { className: '', style: { backgroundColor: `rgb(${239 - intensity * 15}, ${68 - intensity * 2}, ${68 - intensity * 2})` } }
      } else {
        return { className: '', style: { backgroundColor: `rgb(${34 + intensity * 44}, ${197 + intensity * 26}, ${94 + intensity * 42})` } }
      }
    }
  }

  const getChangeColor = (value: number, type: 'long' | 'short'): string => {
    if (value === 0) return 'text-gray-600'

    if (type === 'long') {
      return value > 0 ? 'text-green-600' : 'text-red-600'
    } else {
      return value > 0 ? 'text-red-600' : 'text-green-600'
    }
  }

  const getChangeArrow = (value: number): string => {
    if (value > 0) return ' ↑'
    if (value < 0) return ' ↓'
    return ''
  }

  // Column definitions
  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () => [
      {
        accessorKey: 'report_date',
        header: 'Report Date',
        cell: ({ getValue }) => {
          const date = getValue() as string
          return (
            <div className="font-medium text-gray-900 text-center">
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          )
        },
        size: 120,
      },
      {
        id: 'openInterest',
        accessorFn: (row) => row.values.open_interest_all,
        header: 'Open Interest',
        cell: ({ getValue }) => {
          const value = getValue() as number
          return (
            <div className="text-center font-medium text-gray-900">
              {value?.toLocaleString() || '-'}
            </div>
          )
        },
        size: 120,
      },
      // Producer/Merchant Group
      {
        header: 'Producer/Merchant',
        columns: [
          {
            id: 'prodMerc_long',
            accessorFn: (row) => row.values.prod_merc_positions_long,
            header: 'Long Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'prodMerc_short',
            accessorFn: (row) => row.values.prod_merc_positions_short,
            header: 'Short Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'prodMerc_changeLong',
            accessorFn: (row) => row.values.change_in_prod_merc_long,
            header: 'Change Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'long')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            id: 'prodMerc_changeShort',
            accessorFn: (row) => row.values.change_in_prod_merc_short,
            header: 'Change Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'short')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            accessorKey: 'prodMercNet',
            header: 'Net Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-bold">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'prodMercPctOiLong',
            header: '%OI Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'prodMercPctOiShort',
            header: '%OI Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
        ],
      },
      // Managed Money Group
      {
        header: 'Managed Money',
        columns: [
          {
            id: 'mMoney_long',
            accessorFn: (row) => row.values.m_money_positions_long_all,
            header: 'Long Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'mMoney_short',
            accessorFn: (row) => row.values.m_money_positions_short_all,
            header: 'Short Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'mMoney_changeLong',
            accessorFn: (row) => row.values.change_in_m_money_long_all,
            header: 'Change Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'long')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            id: 'mMoney_changeShort',
            accessorFn: (row) => row.values.change_in_m_money_short_all,
            header: 'Change Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'short')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            accessorKey: 'mMoneyNet',
            header: 'Net Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-bold">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'mMoneyPctOiLong',
            header: '%OI Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'mMoneyPctOiShort',
            header: '%OI Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'mMoneyPctOiSpread',
            header: '%OI Spread',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
        ],
      },
      // Swaps Group
      {
        header: 'Swaps',
        columns: [
          {
            id: 'swaps_long',
            accessorFn: (row) => row.values.swap_positions_long_all,
            header: 'Long Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'swaps_short',
            accessorFn: (row) => row.values.swap__positions_short_all,
            header: 'Short Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'swaps_changeLong',
            accessorFn: (row) => row.values.change_in_swap_long_all,
            header: 'Change Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'long')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            id: 'swaps_changeShort',
            accessorFn: (row) => row.values.change_in_swap_short_all,
            header: 'Change Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'short')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            accessorKey: 'swapNet',
            header: 'Net Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-bold">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'swapPctOiLong',
            header: '%OI Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'swapPctOiShort',
            header: '%OI Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'swapPctOiSpread',
            header: '%OI Spread',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
        ],
      },
      // Other Reportables Group
      {
        header: 'Other Reportables',
        columns: [
          {
            id: 'otherRept_long',
            accessorFn: (row) => row.values.other_rept_positions_long,
            header: 'Long Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'otherRept_short',
            accessorFn: (row) => row.values.other_rept_positions_short,
            header: 'Short Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'otherRept_changeLong',
            accessorFn: (row) => row.values.change_in_other_rept_long,
            header: 'Change Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'long')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            id: 'otherRept_changeShort',
            accessorFn: (row) => row.values.change_in_other_rept_short,
            header: 'Change Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'short')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            accessorKey: 'otherReptNet',
            header: 'Net Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-bold">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'otherReptPctOiLong',
            header: '%OI Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'otherReptPctOiShort',
            header: '%OI Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'otherReptPctOiSpread',
            header: '%OI Spread',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
        ],
      },
      // Non Reportables Group
      {
        header: 'Non Reportables',
        columns: [
          {
            id: 'nonrept_long',
            accessorFn: (row) => row.values.nonrept_positions_long_all,
            header: 'Long Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'nonrept_short',
            accessorFn: (row) => row.values.nonrept_positions_short_all,
            header: 'Short Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-medium">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            id: 'nonrept_changeLong',
            accessorFn: (row) => row.values.change_in_nonrept_long_all,
            header: 'Change Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'long')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            id: 'nonrept_changeShort',
            accessorFn: (row) => row.values.change_in_nonrept_short_all,
            header: 'Change Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className={`text-center font-medium ${getChangeColor(value, 'short')}`}>
                  {value ? `${value > 0 ? '+' : ''}${value.toLocaleString()}${getChangeArrow(value)}` : '-'}
                </div>
              )
            },
            size: 100,
          },
          {
            accessorKey: 'nonreptNet',
            header: 'Net Position',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="text-center font-bold">
                  {value?.toLocaleString() || '-'}
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'nonreptPctOiLong',
            header: '%OI Long',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
          {
            accessorKey: 'nonreptPctOiShort',
            header: '%OI Short',
            cell: ({ getValue }) => {
              const value = getValue() as number
              return (
                <div className="flex items-center justify-end">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{value?.toFixed(1) || '-'}%</span>
                </div>
              )
            },
            size: 120,
          },
        ],
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-md p-4">
        <div className="h-96 flex items-center justify-center">
          <p>Loading positions data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-md p-4">
        <div className="h-96 flex items-center justify-center bg-red-50 rounded-md text-red-800">
          Error loading data: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Positions Table</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportToXLSX}
            disabled={data.length === 0}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export XLSX
          </button>
          <label htmlFor="weeks" className="text-sm font-medium">
            Weeks:
          </label>
          <input
            id="weeks"
            type="number"
            min="1"
            max="260"
            value={weeksInput}
            onChange={(e) => setWeeksInput(Number(e.target.value))}
            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-3 py-1 bg-gold-primary text-white rounded-md text-sm hover:bg-gold-dark disabled:opacity-50"
          >
            Load
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className={`px-1 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider ${
                      index < headerGroup.headers.length - 1 ? 'border-r border-gray-400' : ''
                    }`}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none hover:text-gray-700'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-400">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 border-b border-gray-400">
                {row.getVisibleCells().map((cell, index) => {
                  // Extract the value for background coloring
                  let cellValue = 0
                  let cellType: 'net' | 'long' | 'short' = 'net'
                  let shouldApplyBgColor = false

                  // Try to extract value and type from cell context
                  try {
                    const cellData = cell.getContext()
                    if (cellData && cellData.getValue) {
                      cellValue = cellData.getValue() as number || 0
                    }

                    // Determine cell type based on column properties
                    const columnId = cell.column.id || ''
                    const columnHeader = cell.column.columnDef.header as string || ''

                    if (columnId === 'openInterest' || columnHeader === 'Open Interest') {
                      // Special handling for Open Interest - use blue gradient
                      shouldApplyBgColor = true
                      cellType = 'net' // Will be overridden in getValueColor
                    } else if (columnId.includes('Net') || columnId.includes('net')) {
                      cellType = 'net'
                      shouldApplyBgColor = true
                    } else if (columnId.includes('long') || columnId.includes('Long')) {
                      // Exclude Change Long and %OI Long columns
                      if (!columnId.includes('change') && !columnId.includes('Change') &&
                          !columnId.includes('PctOi') && !columnId.includes('pctOi')) {
                        cellType = 'long'
                        shouldApplyBgColor = true
                      }
                    } else if (columnId.includes('short') || columnId.includes('Short')) {
                      // Exclude Change Short and %OI Short columns
                      if (!columnId.includes('change') && !columnId.includes('Change') &&
                          !columnId.includes('PctOi') && !columnId.includes('pctOi')) {
                        cellType = 'short'
                        shouldApplyBgColor = true
                      }
                    }
                  } catch (e) {
                    // Fallback if we can't determine value/type
                    cellValue = 0
                    cellType = 'net'
                  }

                  const bgColorResult = shouldApplyBgColor ? getValueColor(cellValue, cellType, cell.column.id) : { className: '', style: undefined }

                  return (
                    <td
                      key={cell.id}
                      className={`px-1 py-1 whitespace-nowrap text-sm ${bgColorResult.className} ${
                        index < row.getVisibleCells().length - 1 ? 'border-r border-gray-200' : ''
                      }`}
                      style={bgColorResult.style}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
          <span>({data.length} total records)</span>
        </div>
      </div>

    </div>
  )
}
