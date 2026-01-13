'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'
import { getMultipleTrendData, type MultipleTrendResponse, type HistoricalPricePoint } from '@/lib/api'

// Import Highcharts Stock module
if (typeof Highcharts === 'object') {
  require('highcharts/modules/stock')(Highcharts)
}

interface NetPositionsChartProps {
  commodityName: string
  showPrice?: boolean
  priceData?: HistoricalPricePoint[]
}

interface NetPositionData {
  reportDate: string
  producerMerchantNet: number
  swapNet: number
  managedMoneyNet: number
  otherReportableNet: number
  nonReportablesNet: number
  openInterest: number
}

export default function NetPositionsChart({
  commodityName,
  showPrice = false,
  priceData = [],
}: NetPositionsChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [data, setData] = useState<NetPositionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Required fields for API call
  const requiredFields = [
    'prod_merc_positions_long',
    'prod_merc_positions_short',
    'swap_positions_long_all',
    'swap__positions_short_all',
    'm_money_positions_long_all',
    'm_money_positions_short_all',
    'other_rept_positions_long',
    'other_rept_positions_short',
    'nonrept_positions_long_all',
    'nonrept_positions_short_all',
    'open_interest_all',
  ]

  // Colors for different net positions
  const netColors = [
    '#E63946', // Producer/Merchant Net - Red
    '#F4A261', // Swap Net - Orange
    '#2A9D8F', // Managed Money Net - Teal
    '#264653', // Other Reportable Net - Dark Cyan
    '#7209B7', // Non Reportables Net - Purple
  ]

  // Load data on commodity change
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response: MultipleTrendResponse = await getMultipleTrendData(
          commodityName,
          requiredFields,
          999
        )

        // Process data to calculate net positions
        const processedData: NetPositionData[] = response.data_points.map((point) => {
          const values = point.values
          return {
            reportDate: point.report_date,
            producerMerchantNet: (values.prod_merc_positions_long || 0) - (values.prod_merc_positions_short || 0),
            swapNet: (values.swap_positions_long_all || 0) - (values.swap__positions_short_all || 0),
            managedMoneyNet: (values.m_money_positions_long_all || 0) - (values.m_money_positions_short_all || 0),
            otherReportableNet: (values.other_rept_positions_long || 0) - (values.other_rept_positions_short || 0),
            nonReportablesNet: (values.nonrept_positions_long_all || 0) - (values.nonrept_positions_short_all || 0),
            openInterest: values.open_interest_all || 0,
          }
        })

        // Sort by date ascending
        processedData.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())

        setData(processedData)
      } catch (err: any) {
        console.error('Failed to load net positions data:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [commodityName])

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      } else if ((containerRef.current as any).webkitRequestFullscreen) {
        (containerRef.current as any).webkitRequestFullscreen()
      } else if ((containerRef.current as any).mozRequestFullScreen) {
        (containerRef.current as any).mozRequestFullScreen()
      } else if ((containerRef.current as any).msRequestFullscreen) {
        (containerRef.current as any).msRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
    }
  }

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Memoize series data
  const { barSeries, lineSeries, priceSeries } = useMemo(() => {
    if (data.length === 0) {
      return {
        barSeries: [] as Array<{ name: string; data: number[][]; color: string }>,
        lineSeries: { name: '', data: [] as number[][], color: '' },
        priceSeries: { name: '', data: [] as number[][], color: '' }
      }
    }

    // Create bar series for each net position
    const bars: Array<{ name: string; data: number[][]; color: string }> = [
      {
        name: 'Producer/Merchant Net',
        data: data.map(d => [new Date(d.reportDate).getTime(), d.producerMerchantNet]),
        color: netColors[0],
      },
      {
        name: 'Swap(Commercials) Net',
        data: data.map(d => [new Date(d.reportDate).getTime(), d.swapNet]),
        color: netColors[1],
      },
      {
        name: 'Managed Money Net',
        data: data.map(d => [new Date(d.reportDate).getTime(), d.managedMoneyNet]),
        color: netColors[2],
      },
      {
        name: 'Other Reportable Net',
        data: data.map(d => [new Date(d.reportDate).getTime(), d.otherReportableNet]),
        color: netColors[3],
      },
      {
        name: 'Non Reportables Net',
        data: data.map(d => [new Date(d.reportDate).getTime(), d.nonReportablesNet]),
        color: netColors[4],
      },
    ]

    // Create line series for open interest
    const line = {
      name: 'Open Interest',
      data: data.map(d => [new Date(d.reportDate).getTime(), d.openInterest]),
      color: '#2196F3',
    }

    // Create price series if enabled
    const price = showPrice ? {
      name: 'Price',
      data: priceData.map(d => [new Date(d.date).getTime(), d.close || 0]),
      color: '#FF6B35',
    } : { name: '', data: [] as number[][], color: '' }

    return { barSeries: bars, lineSeries: line, priceSeries: price }
  }, [data, showPrice, priceData])

  const options: Highcharts.Options = {
    chart: {
      type: 'column',
      height: isFullscreen && typeof window !== 'undefined' ? window.innerHeight - 100 : 500,
    },
    title: {
      text: `${commodityName} - Net Positions`,
      style: {
        fontSize: '14px',
        fontWeight: 'bold',
      },
    },
    credits: {
      enabled: false,
    },
    rangeSelector: {
      selected: 3,
      buttons: [
        { type: 'month', count: 1, text: '1M' },
        { type: 'month', count: 3, text: '3M' },
        { type: 'month', count: 6, text: '6M' },
        { type: 'year', count: 1, text: '1Y' },
        { type: 'year', count: 2, text: '2Y' },
        { type: 'year', count: 3, text: '3Y' },
        { type: 'year', count: 5, text: '5Y' },
        { type: 'all', text: 'All' },
      ],
      inputEnabled: false,
    },
    xAxis: {
      type: 'datetime',
      labels: {
        rotation: -90,
        style: {
          fontSize: '10px',
        },
      },
    },
    yAxis: showPrice ? [
      {
        title: { text: 'Net Positions' },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: false,
      },
      {
        title: { text: 'Open Interest' },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: true,
      },
      {
        title: { text: 'Price ($)' },
        labels: {
          formatter: function () {
            const val = typeof this.value === 'number' ? this.value : parseFloat(String(this.value))
            return '$' + val.toFixed(2)
          },
        },
        opposite: true,
      },
    ] : [
      {
        title: { text: 'Net Positions' },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: false,
      },
      {
        title: { text: 'Open Interest' },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: true,
      },
    ],
    legend: {
      enabled: true,
      align: 'right',
      verticalAlign: 'top',
      floating: false,
    },
    tooltip: {
      shared: true,
      split: false,
      formatter: function () {
        const date = new Date(this.x || 0)
        const dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
        let tooltip = `<b>${dateStr}</b><br/>`
        if (this.points) {
          this.points.forEach((point: any) => {
            if (point.series.name === 'Open Interest') {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toLocaleString()}</b><br/>`
            } else {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toLocaleString()}</b><br/>`
            }
          })
        }
        return tooltip
      },
    },
    plotOptions: {
      column: {
        grouping: false, // Allow bars to overlap
        shadow: false,
        borderWidth: 0,
        dataLabels: { enabled: false },
        pointPadding: 0.1,
        groupPadding: 0.1,
      },
      line: {
        dataLabels: { enabled: false },
        marker: { enabled: true, radius: 2 },
      },
    },
    series: [
      // Add all bar series
      ...barSeries.map((series) => ({
        name: series.name,
        type: 'column' as const,
        data: series.data,
        yAxis: 0,
        color: series.color,
      })),
      // Add line series for open interest
      {
        name: lineSeries.name,
        type: 'line' as const,
        data: lineSeries.data,
        yAxis: 1,
        color: lineSeries.color,
        lineWidth: 2,
      },
      // Add price series if enabled
      ...(showPrice && priceSeries.data.length > 0 ? [{
        name: priceSeries.name,
        type: 'line' as const,
        data: priceSeries.data,
        yAxis: 2,
        color: priceSeries.color,
        lineWidth: 2,
      }] : []),
    ],
  }

  // Update chart height when fullscreen changes
  useEffect(() => {
    if (chartRef.current?.chart && typeof window !== 'undefined') {
      const chart = chartRef.current.chart
      chart.setSize(
        undefined,
        isFullscreen ? window.innerHeight - 100 : 500,
        false
      )
    }
  }, [isFullscreen])

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current?.chart && barSeries.length > 0) {
      const chart = chartRef.current.chart

      // Remove all existing series
      while (chart.series.length > 0) {
        chart.series[0].remove(false)
      }

      // Add all bar series
      barSeries.forEach((series) => {
        chart.addSeries({
          name: series.name,
          type: 'column',
          data: series.data,
          yAxis: 0,
          color: series.color,
          pointPadding: 0.1,
          groupPadding: 0.1,
        } as Highcharts.SeriesOptionsType, false)
      })

      // Add line series for open interest
      chart.addSeries({
        name: lineSeries.name,
        type: 'line',
        data: lineSeries.data,
        yAxis: 1,
        color: lineSeries.color,
        lineWidth: 2,
      } as Highcharts.SeriesOptionsType, false)

      // Add price series if enabled
      if (showPrice && priceSeries.data.length > 0) {
        chart.addSeries({
          name: priceSeries.name,
          type: 'line',
          data: priceSeries.data,
          yAxis: 2,
          color: priceSeries.color,
          lineWidth: 2,
        } as Highcharts.SeriesOptionsType, false)
      }

      chart.redraw()
    }
  }, [barSeries, lineSeries, priceSeries, showPrice])

  if (isLoading) {
    return (
      <div className="bg-white rounded-md p-4 relative">
        <div className="h-96 flex items-center justify-center">
          <p>Loading net positions data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-md p-4 relative">
        <div className="h-96 flex items-center justify-center bg-red-50 rounded-md text-red-800">
          Error loading data: {error}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-md p-4 relative">
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-md text-gray-600">
          No data available for {commodityName}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white rounded-md ${isFullscreen ? 'fixed inset-0 z-50 p-4' : 'p-4'} relative`}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-10 bg-gray-200 hover:bg-gray-300 rounded p-2 transition-colors"
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
      />
    </div>
  )
}