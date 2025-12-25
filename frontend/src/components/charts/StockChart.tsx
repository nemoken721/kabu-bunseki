'use client'

import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface StockPrice {
  date: string
  open_price: number | null
  high_price: number | null
  low_price: number | null
  close_price: number | null
  volume: number | null
}

interface StockChartProps {
  stockPrices: StockPrice[]
  companyName?: string
}

type ChartType = 'line' | 'candlestick'
type MAType = 'none' | '5' | '25' | '75' | 'all'

export default function StockChart({ stockPrices, companyName }: StockChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line')
  const [showMA, setShowMA] = useState<MAType>('25')
  const [showVolume, setShowVolume] = useState(true)

  // 移動平均を計算
  const calculateMA = (prices: number[], period: number): (number | null)[] => {
    return prices.map((_, index) => {
      if (index < period - 1) return null
      const slice = prices.slice(index - period + 1, index + 1)
      const sum = slice.reduce((a, b) => a + b, 0)
      return sum / period
    })
  }

  const chartData = useMemo(() => {
    const labels = stockPrices.map(p => p.date)
    const closePrices = stockPrices.map(p => p.close_price || 0)
    const volumes = stockPrices.map(p => p.volume || 0)

    const datasets: {
      label: string
      data: (number | null)[]
      borderColor: string
      backgroundColor: string
      fill?: boolean
      yAxisID?: string
      tension?: number
      pointRadius?: number
      borderWidth?: number
    }[] = [
      {
        label: '終値',
        data: closePrices,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 2,
      },
    ]

    // 移動平均線を追加
    if (showMA === '5' || showMA === 'all') {
      datasets.push({
        label: '5日移動平均',
        data: calculateMA(closePrices, 5),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1.5,
      })
    }

    if (showMA === '25' || showMA === 'all') {
      datasets.push({
        label: '25日移動平均',
        data: calculateMA(closePrices, 25),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1.5,
      })
    }

    if (showMA === '75' || showMA === 'all') {
      datasets.push({
        label: '75日移動平均',
        data: calculateMA(closePrices, 75),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        borderWidth: 1.5,
      })
    }

    return { labels, datasets }
  }, [stockPrices, showMA])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            return `${label}: ¥${value?.toLocaleString()}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 10,
        },
      },
      y: {
        position: 'right' as const,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          callback: (value: string | number) => `¥${Number(value).toLocaleString()}`,
        },
      },
    },
  }

  // ローソク足用のデータ
  const candlestickData = useMemo(() => {
    return stockPrices.map(p => ({
      date: p.date,
      open: p.open_price,
      high: p.high_price,
      low: p.low_price,
      close: p.close_price,
      isUp: (p.close_price || 0) >= (p.open_price || 0),
    }))
  }, [stockPrices])

  if (stockPrices.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">株価データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* コントロール */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">チャート:</span>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="line">ラインチャート</option>
            <option value="candlestick">ローソク足</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">移動平均:</span>
          <select
            value={showMA}
            onChange={(e) => setShowMA(e.target.value as MAType)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="none">なし</option>
            <option value="5">5日</option>
            <option value="25">25日</option>
            <option value="75">75日</option>
            <option value="all">全て表示</option>
          </select>
        </div>
      </div>

      {/* チャート */}
      <div className="h-72">
        {chartType === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <CandlestickChart data={candlestickData} showMA={showMA} closePrices={stockPrices.map(p => p.close_price || 0)} />
        )}
      </div>

      {/* 出来高 */}
      {showVolume && stockPrices.some(p => p.volume) && (
        <div className="h-20">
          <VolumeChart stockPrices={stockPrices} />
        </div>
      )}
    </div>
  )
}

// ローソク足チャート（SVGベース）
function CandlestickChart({
  data,
  showMA,
  closePrices
}: {
  data: { date: string; open: number | null; high: number | null; low: number | null; close: number | null; isUp: boolean }[]
  showMA: MAType
  closePrices: number[]
}) {
  const width = 800
  const height = 280
  const padding = { top: 20, right: 60, bottom: 30, left: 10 }

  const calculateMA = (prices: number[], period: number): (number | null)[] => {
    return prices.map((_, index) => {
      if (index < period - 1) return null
      const slice = prices.slice(index - period + 1, index + 1)
      const sum = slice.reduce((a, b) => a + b, 0)
      return sum / period
    })
  }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // 価格範囲を計算
  const prices = data.flatMap(d => [d.open, d.high, d.low, d.close].filter((p): p is number => p !== null))
  const minPrice = Math.min(...prices) * 0.99
  const maxPrice = Math.max(...prices) * 1.01
  const priceRange = maxPrice - minPrice

  // スケール関数
  const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth
  const yScale = (price: number) => padding.top + ((maxPrice - price) / priceRange) * chartHeight

  const candleWidth = Math.max(2, Math.min(8, chartWidth / data.length - 2))

  // 移動平均線のパス
  const maLines: { period: number; color: string; path: string }[] = []

  if (showMA === '5' || showMA === 'all') {
    const ma5 = calculateMA(closePrices, 5)
    const path = ma5
      .map((v, i) => (v !== null ? `${i === 0 || ma5[i-1] === null ? 'M' : 'L'}${xScale(i)},${yScale(v)}` : ''))
      .join(' ')
    maLines.push({ period: 5, color: '#ef4444', path })
  }

  if (showMA === '25' || showMA === 'all') {
    const ma25 = calculateMA(closePrices, 25)
    const path = ma25
      .map((v, i) => (v !== null ? `${i === 0 || ma25[i-1] === null ? 'M' : 'L'}${xScale(i)},${yScale(v)}` : ''))
      .join(' ')
    maLines.push({ period: 25, color: '#22c55e', path })
  }

  if (showMA === '75' || showMA === 'all') {
    const ma75 = calculateMA(closePrices, 75)
    const path = ma75
      .map((v, i) => (v !== null ? `${i === 0 || ma75[i-1] === null ? 'M' : 'L'}${xScale(i)},${yScale(v)}` : ''))
      .join(' ')
    maLines.push({ period: 75, color: '#a855f7', path })
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* グリッド */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <g key={ratio}>
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * ratio}
            x2={width - padding.right}
            y2={padding.top + chartHeight * ratio}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text
            x={width - padding.right + 5}
            y={padding.top + chartHeight * ratio + 4}
            fontSize={10}
            fill="#6b7280"
          >
            ¥{Math.round(maxPrice - priceRange * ratio).toLocaleString()}
          </text>
        </g>
      ))}

      {/* ローソク足 */}
      {data.map((d, i) => {
        if (d.open === null || d.close === null || d.high === null || d.low === null) return null

        const x = xScale(i)
        const open = yScale(d.open)
        const close = yScale(d.close)
        const high = yScale(d.high)
        const low = yScale(d.low)

        const bodyTop = Math.min(open, close)
        const bodyHeight = Math.abs(close - open) || 1

        return (
          <g key={i}>
            {/* ヒゲ */}
            <line
              x1={x}
              y1={high}
              x2={x}
              y2={low}
              stroke={d.isUp ? '#22c55e' : '#ef4444'}
              strokeWidth={1}
            />
            {/* 実体 */}
            <rect
              x={x - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={d.isUp ? '#22c55e' : '#ef4444'}
            />
          </g>
        )
      })}

      {/* 移動平均線 */}
      {maLines.map((ma) => (
        <path
          key={ma.period}
          d={ma.path}
          stroke={ma.color}
          strokeWidth={1.5}
          fill="none"
        />
      ))}

      {/* X軸ラベル */}
      {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i, arr) => (
        <text
          key={i}
          x={xScale(data.indexOf(d))}
          y={height - 5}
          fontSize={10}
          fill="#6b7280"
          textAnchor="middle"
        >
          {d.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

// 出来高チャート
function VolumeChart({ stockPrices }: { stockPrices: StockPrice[] }) {
  const data = {
    labels: stockPrices.map(p => p.date),
    datasets: [
      {
        label: '出来高',
        data: stockPrices.map(p => p.volume || 0),
        backgroundColor: stockPrices.map(p => {
          const isUp = (p.close_price || 0) >= (p.open_price || 0)
          return isUp ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        }),
        borderWidth: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        position: 'right' as const,
        grid: {
          display: false,
        },
        ticks: {
          callback: (value: string | number) => {
            const num = Number(value)
            if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
            if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
            return num.toString()
          },
        },
      },
    },
  }

  return <Line data={data} options={options} />
}
