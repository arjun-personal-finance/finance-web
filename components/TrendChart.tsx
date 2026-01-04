'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'
import type { TrendDataPoint, HistoricalPricePoint } from '@/lib/api'

// Import Highcharts Stock module
if (typeof Highcharts === 'object') {
  require('highcharts/modules/stock')(Highcharts)
}

interface TrendChartProps {
  trendDataMap: Record<string, TrendDataPoint[]>
  commodityName: string
  priceVolumeData: HistoricalPricePoint[]
}

export default function TrendChart({
  trendDataMap,
  commodityName,
  priceVolumeData,
}: TrendChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Log price/volume data for debugging
  useEffect(() => {
    console.log('Price/volume data received:', priceVolumeData.length, 'points')
    if (priceVolumeData.length > 0) {
      console.log('First price data point:', priceVolumeData[0])
    }
  }, [priceVolumeData])

  // Generate colors for multiple series
  const getColorForIndex = (index: number): string => {
    const colors = [
      '#D4AF37', // Gold
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336', // Red
      '#00BCD4', // Cyan
      '#FFC107', // Amber
      '#795548', // Brown
      '#607D8B', // Blue Grey
    ]
    return colors[index % colors.length]
  }

  // Memoize series data
  const { fieldSeries, priceData, volumeData, hasPriceVolume, hasVolume } = useMemo(() => {
    const fields = Object.keys(trendDataMap)
    console.log('Trend data fields:', fields.length)
    
    // Prepare field data for each selected field
    const series = fields.map((fieldName, index) => {
      const trendData = trendDataMap[fieldName]
      const fieldData = trendData.map((point) => {
        const date = new Date(point.reportDate).getTime()
        return [date, point.value]
      })
      
      const fieldDisplayName = fieldName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
      
      return {
        name: fieldDisplayName,
        data: fieldData,
        color: getColorForIndex(index),
      }
    })

    // Prepare price data (daily) - all price/volume data points, not filtered to trend dates
    const pData = priceVolumeData
      .map((item) => {
        if (item.close != null) {
          const date = new Date(item.date).getTime()
          if (!isNaN(date)) {
            return [date, item.close] as [number, number]
          }
        }
        return null
      })
      .filter((item): item is [number, number] => item !== null)

    // Prepare volume data (daily) - all price/volume data points, not filtered to trend dates
    const vData = priceVolumeData
      .map((item) => {
        if (item.volume != null) {
          const date = new Date(item.date).getTime()
          if (!isNaN(date)) {
            return [date, item.volume] as [number, number]
          }
        }
        return null
      })
      .filter((item): item is [number, number] => item !== null)

    console.log('Field series:', series.length)
    console.log('Price data points (daily):', pData.length, 'Volume data points (daily):', vData.length)

    return {
      fieldSeries: series,
      priceData: pData,
      volumeData: vData,
      hasPriceVolume: pData.length > 0,
      hasVolume: vData.length > 0,
    }
  }, [trendDataMap, priceVolumeData])

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

  const options: Highcharts.Options = {
    chart: {
      type: 'line',
      height: isFullscreen && typeof window !== 'undefined' ? window.innerHeight - 100 : (hasVolume ? 500 : 400),
    },
    title: {
      text: `${commodityName} - Multiple Fields${
        hasPriceVolume ? ' (with Price/Volume)' : ''
      }`,
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
    yAxis: [
      {
        title: { text: 'Field Values' },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: false,
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
      {
        title: { text: 'Volume' },
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
            if (point.series.name === 'Volume') {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toLocaleString()}</b><br/>`
            } else if (point.series.name === 'Price') {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>$${point.y.toFixed(2)}</b><br/>`
            } else {
              tooltip += `<span style="color:${point.color}">●</span> ${point.series.name}: <b>${point.y.toLocaleString()}</b><br/>`
            }
          })
        }
        return tooltip
      },
    },
    plotOptions: {
      line: {
        dataLabels: { enabled: false },
        marker: { enabled: true, radius: 2 },
      },
      column: {
        grouping: false,
        shadow: false,
        borderWidth: 0,
        dataLabels: { enabled: false },
      },
    },
    series: [
      // Add all field series
      ...fieldSeries.map((field) => ({
        name: field.name,
        type: 'line' as const,
        data: field.data,
        yAxis: 0,
        color: field.color,
        lineWidth: 2,
      })),
      // Add price series if enabled
      ...(hasPriceVolume
        ? [
            {
              name: 'Price',
              type: 'line' as const,
              data: priceData,
              yAxis: 1,
              color: '#2196F3',
              lineWidth: 2,
            } as Highcharts.SeriesOptionsType,
          ]
        : []),
      // Add volume series if enabled
      ...(hasVolume
        ? [
            {
              name: 'Volume',
              type: 'column' as const,
              data: volumeData,
              yAxis: 2,
              color: '#9E9E9E',
            } as Highcharts.SeriesOptionsType,
          ]
        : []),
    ],
  }

  // Update chart height when fullscreen changes
  useEffect(() => {
    if (chartRef.current?.chart && typeof window !== 'undefined') {
      const chart = chartRef.current.chart
      chart.setSize(
        undefined,
        isFullscreen ? window.innerHeight - 100 : (hasVolume ? 500 : 400),
        false
      )
    }
  }, [isFullscreen, hasVolume])

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current?.chart) {
      const chart = chartRef.current.chart
      
      // Remove all existing series
      while (chart.series.length > 0) {
        chart.series[0].remove(false)
      }
      
      // Add all field series
      fieldSeries.forEach((field) => {
        chart.addSeries({
          name: field.name,
          type: 'line',
          data: field.data,
          yAxis: 0,
          color: field.color,
          lineWidth: 2,
        } as Highcharts.SeriesOptionsType, false)
      })
      
      // Add price series if enabled
      if (hasPriceVolume) {
        chart.addSeries({
          name: 'Price',
          type: 'line',
          data: priceData,
          yAxis: 1,
          color: '#2196F3',
          lineWidth: 2,
        } as Highcharts.SeriesOptionsType, false)
      }
      
      // Add volume series if enabled
      if (hasVolume) {
        chart.addSeries({
          name: 'Volume',
          type: 'column',
          data: volumeData,
          yAxis: 2,
          color: '#9E9E9E',
        } as Highcharts.SeriesOptionsType, false)
      }
      
      chart.redraw()
    }
  }, [fieldSeries, priceData, volumeData, hasPriceVolume, hasVolume])

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

