'use client'

import { useRef, useEffect, useMemo } from 'react'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'
import type { TrendDataPoint, HistoricalPricePoint } from '@/lib/api'

// Import Highcharts Stock module
if (typeof Highcharts === 'object') {
  require('highcharts/modules/stock')(Highcharts)
}

interface TrendChartProps {
  trendData: TrendDataPoint[]
  fieldName: string
  commodityName: string
  priceVolumeData: HistoricalPricePoint[]
}

export default function TrendChart({
  trendData,
  fieldName,
  commodityName,
  priceVolumeData,
}: TrendChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null)

  // Log price/volume data for debugging
  useEffect(() => {
    console.log('Price/volume data received:', priceVolumeData.length, 'points')
    if (priceVolumeData.length > 0) {
      console.log('First price data point:', priceVolumeData[0])
    }
  }, [priceVolumeData])

  // Memoize series data
  const { fieldData, priceData, volumeData, hasPriceVolume, hasVolume } = useMemo(() => {
    console.log('Trend data points:', trendData.length)
    if (trendData.length > 0) {
      console.log('First trend data point date:', trendData[0].reportDate)
    }

    // Prepare field data (weekly) - only trend data points
    const fData = trendData.map((point) => {
      const date = new Date(point.reportDate).getTime()
      return [date, point.value]
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

    console.log('Field data points (weekly):', fData.length)
    console.log('Price data points (daily):', pData.length, 'Volume data points (daily):', vData.length)

    return {
      fieldData: fData,
      priceData: pData,
      volumeData: vData,
      hasPriceVolume: pData.length > 0,
      hasVolume: vData.length > 0,
    }
  }, [trendData, priceVolumeData])

  const fieldDisplayName = fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())

  const options: Highcharts.Options = {
    chart: {
      type: 'line',
      height: hasVolume ? 500 : 400,
    },
    title: {
      text: `${fieldDisplayName} - ${commodityName}${
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
        title: { text: fieldDisplayName },
        labels: {
          formatter: function () {
            return this.value.toLocaleString()
          },
        },
        opposite: false,
        height: hasVolume ? '50%' : '100%',
        top: '0%',
      },
      ...(hasPriceVolume
        ? [
            {
              title: { text: 'Price ($)' },
              labels: {
                formatter: function () {
                  return this.value.toFixed(2)
                },
              },
              opposite: true,
              height: hasVolume ? '50%' : '100%',
              top: '0%',
              tickAmount: 5, // Reduced tick marks
            } as Highcharts.YAxisOptions,
          ]
        : []),
      ...(hasVolume
        ? [
            {
              title: { text: 'Volume' },
              labels: {
                formatter: function () {
                  return this.value.toLocaleString()
                },
              },
              opposite: false,
              height: '25%',
              top: '75%',
              offset: 0,
            } as Highcharts.YAxisOptions,
          ]
        : []),
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
      {
        name: fieldDisplayName,
        type: 'line',
        data: fieldData,
        yAxis: 0,
        color: '#D4AF37',
        lineWidth: 2,
      },
      ...(hasPriceVolume
        ? [
            {
              name: 'Price',
              type: 'line',
              data: priceData,
              yAxis: 1,
              color: '#2196F3',
              lineWidth: 2,
            } as Highcharts.SeriesOptionsType,
          ]
        : []),
      ...(hasVolume
        ? [
            {
              name: 'Volume',
              type: 'column',
              data: volumeData,
              yAxis: hasPriceVolume ? 2 : 1,
              color: '#9E9E9E',
            } as Highcharts.SeriesOptionsType,
          ]
        : []),
    ],
  }

  // Update chart when data changes
  useEffect(() => {
    if (chartRef.current?.chart) {
      const chart = chartRef.current.chart
      
      // Update series
      if (chart.series.length > 0) {
        chart.series[0].setData(fieldData, false)
        
        if (hasPriceVolume && chart.series.length > 1) {
          chart.series[1].setData(priceData, false)
        } else if (hasPriceVolume && chart.series.length === 1) {
          chart.addSeries({
            name: 'Price',
            type: 'line',
            data: priceData,
            yAxis: 1,
            color: '#2196F3',
            lineWidth: 2,
          } as Highcharts.SeriesOptionsType, false)
        }
        
        if (hasVolume) {
          const volumeSeriesIndex = hasPriceVolume ? 2 : 1
          if (chart.series.length > volumeSeriesIndex) {
            chart.series[volumeSeriesIndex].setData(volumeData, false)
          } else {
            chart.addSeries({
              name: 'Volume',
              type: 'column',
              data: volumeData,
              yAxis: hasPriceVolume ? 2 : 1,
              color: '#9E9E9E',
            } as Highcharts.SeriesOptionsType, false)
          }
        }
        
        chart.redraw()
      }
    }
  }, [fieldData, priceData, volumeData, hasPriceVolume, hasVolume])

  return (
    <div className="bg-white p-4 rounded-md">
      <HighchartsReact
        ref={chartRef}
        highcharts={Highcharts}
        constructorType={'stockChart'}
        options={options}
      />
    </div>
  )
}

