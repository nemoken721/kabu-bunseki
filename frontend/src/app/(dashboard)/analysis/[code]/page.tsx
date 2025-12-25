'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { api, Company, StockPrice, FinancialStatement } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import Header from '@/components/Header'
import StockChart from '@/components/charts/StockChart'

interface FinancialSummary {
  revenue: number | null
  operating_income: number | null
  net_income: number | null
  total_assets: number | null
  roe: number | null
  eps: number | null
  bps: number | null
  revenue_growth: number | null
  profit_growth: number | null
}

interface FinancialTrend {
  years: number[]
  revenue: (number | null)[]
  operating_income: (number | null)[]
  net_income: (number | null)[]
  total_assets: (number | null)[]
  roe: (number | null)[]
}

interface LatestPriceResponse {
  code: string
  company_name: string
  date: string
  close_price: number
  volume: number | null
}

interface AnalysisReport {
  summary: string
  features: string
  prediction: string
  reasoning: string
}

interface PageProps {
  params: Promise<{ code: string }>
}

export default function AnalysisPage({ params }: PageProps) {
  const { code } = use(params)
  const { user, session } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([])
  const [latestPrice, setLatestPrice] = useState<LatestPriceResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [financialTrend, setFinancialTrend] = useState<FinancialTrend | null>(null)
  const [latestFiscalYear, setLatestFiscalYear] = useState<number | null>(null)
  const [financialDataPoints, setFinancialDataPoints] = useState(0)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [isFetchingFinancial, setIsFetchingFinancial] = useState(false)
  const [fetchFinancialMessage, setFetchFinancialMessage] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [code])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 企業情報と最新株価を並列取得
      const [companyData, priceData] = await Promise.all([
        api.getCompany(code),
        api.getLatestPrice(code).catch(() => null)
      ])

      setCompany(companyData)
      setLatestPrice(priceData)

      // 過去1年の株価データ取得
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      try {
        const stockData = await api.getStockPrices(code, {
          start_date: oneYearAgo.toISOString().split('T')[0],
          fetch_latest: true
        })
        setStockPrices(stockData.stock_prices || [])
      } catch (e) {
        console.log('株価データなし:', e)
        setStockPrices([])
      }

      // 財務データを取得
      try {
        const financialData = await api.getFinancialSummary(code)
        setFinancialSummary(financialData.summary)
        setFinancialTrend(financialData.trend)
        setLatestFiscalYear(financialData.latest_fiscal_year)
        setFinancialDataPoints(financialData.data_points)
      } catch (e) {
        console.log('財務データなし:', e)
      }
    } catch (err) {
      console.error('データ取得エラー:', err)
      setError('データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ウォッチリスト状態を確認
  useEffect(() => {
    if (session && code) {
      checkWatchlistStatus()
    }
  }, [session, code])

  const checkWatchlistStatus = async () => {
    if (!session) return
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/check/${code}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      )
      if (response.ok) {
        const data = await response.json()
        setIsInWatchlist(data.in_watchlist)
      }
    } catch (err) {
      console.error('Watchlist check error:', err)
    }
  }

  const toggleWatchlist = async () => {
    if (!session) {
      console.log('No session available')
      return
    }
    setWatchlistLoading(true)
    try {
      if (isInWatchlist) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/${code}`,
          {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }
        )
        if (response.ok) {
          setIsInWatchlist(false)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Delete watchlist error:', response.status, errorData)
        }
      } else {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/add`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ company_code: code })
          }
        )
        if (response.ok) {
          setIsInWatchlist(true)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Add watchlist error:', response.status, errorData)
        }
      }
    } catch (err) {
      console.error('Watchlist toggle error:', err)
    } finally {
      setWatchlistLoading(false)
    }
  }

  // 金額をフォーマット（億円単位）
  const formatAmount = (value: number | null): string => {
    if (value === null) return '-'
    const oku = value / 100000000
    if (oku >= 10000) {
      return `${(oku / 10000).toFixed(1)}兆円`
    }
    return `${oku.toFixed(0)}億円`
  }

  // EDINETから財務データを取得
  const fetchFinancialData = async () => {
    setIsFetchingFinancial(true)
    setFetchFinancialMessage(null)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/companies/${code}/fetch-financial-data`,
        { method: 'POST' }
      )
      if (response.ok) {
        const data = await response.json()
        setFetchFinancialMessage(data.message || 'データ取得を開始しました。1〜2分後に再読み込みしてください。')
        // 10秒後に自動リロード
        setTimeout(() => {
          loadData()
        }, 10000)
      } else {
        setFetchFinancialMessage('データ取得に失敗しました')
      }
    } catch (err) {
      console.error('Financial fetch error:', err)
      setFetchFinancialMessage('データ取得に失敗しました')
    } finally {
      setIsFetchingFinancial(false)
    }
  }

  const generateReport = async () => {
    setIsGenerating(true)
    setReportError(null)
    try {
      const result = await api.generateReport(code)
      setReport(result.report)
    } catch (err) {
      console.error('レポート生成エラー:', err)
      setReportError('レポートの生成に失敗しました')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col justify-center items-center py-16 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
            <span className="mt-4 text-base sm:text-xl text-gray-600">データを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <p className="text-red-500 text-lg sm:text-xl mb-4">{error || '企業が見つかりません'}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-base font-medium"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 株価変動の計算
  const priceChange = (() => {
    if (!latestPrice || stockPrices.length < 2) return null
    const prevPrice = stockPrices[stockPrices.length - 2]
    if (!prevPrice || !prevPrice.close_price) return null
    return ((latestPrice.close_price - prevPrice.close_price) / prevPrice.close_price * 100)
  })()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 active:text-gray-900 p-1 -ml-1 rounded"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className="font-mono text-blue-600">{company.code}</span>
                  <span className="truncate">{company.name}</span>
                </h1>
                {company.name_en && (
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{company.name_en}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs sm:text-sm">
                {company.sector}
              </span>
              <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs sm:text-sm">
                {company.market}
              </span>
              {user && (
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className={`px-3 py-1.5 sm:py-1 rounded text-sm font-medium transition-colors ${
                    isInWatchlist
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 active:bg-yellow-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
                  } disabled:opacity-50`}
                >
                  {watchlistLoading ? '...' : isInWatchlist ? '★ ウォッチ中' : '☆ ウォッチ'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 株価サマリー */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">最新株価</h2>
            {latestPrice ? (
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  ¥{latestPrice.close_price?.toLocaleString() || '-'}
                </div>
                {priceChange !== null && (
                  <div className={`text-base sm:text-lg font-medium ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                )}
                <div className="text-xs sm:text-sm text-gray-500 mt-2">
                  {latestPrice.date ? new Date(latestPrice.date).toLocaleDateString('ja-JP') : '-'}
                </div>
                <div className="mt-3 sm:mt-4 text-sm">
                  <div>
                    <span className="text-gray-500">出来高</span>
                    <div className="font-medium">{latestPrice.volume?.toLocaleString() || '-'} 株</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm sm:text-base">株価データがありません</div>
            )}
          </div>

          {/* 株価チャート */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">株価推移（過去1年）</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <StockChart stockPrices={stockPrices} companyName={company.name} />
            </div>
            {stockPrices.length > 0 && (
              <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">
                データ件数: {stockPrices.length} 日分
              </p>
            )}
          </div>

          {/* 財務データ（10年推移） */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-4">
              <h2 className="text-base sm:text-lg font-semibold">財務データ（10年推移）</h2>
              {latestFiscalYear && (
                <span className="text-xs sm:text-sm text-gray-500">
                  最新: {latestFiscalYear}年度 / {financialDataPoints}年分
                </span>
              )}
            </div>

            {financialSummary ? (
              <div className="space-y-4 sm:space-y-6">
                {/* 主要指標サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500">売上高</div>
                    <div className="text-base sm:text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.revenue)}
                    </div>
                    {financialSummary.revenue_growth !== null && (
                      <div className={`text-xs sm:text-sm ${financialSummary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        前年比 {financialSummary.revenue_growth >= 0 ? '+' : ''}{financialSummary.revenue_growth}%
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500">営業利益</div>
                    <div className="text-base sm:text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.operating_income)}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500">純利益</div>
                    <div className="text-base sm:text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.net_income)}
                    </div>
                    {financialSummary.profit_growth !== null && (
                      <div className={`text-xs sm:text-sm ${financialSummary.profit_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        前年比 {financialSummary.profit_growth >= 0 ? '+' : ''}{financialSummary.profit_growth}%
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-gray-500">総資産</div>
                    <div className="text-base sm:text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.total_assets)}
                    </div>
                  </div>
                </div>

                {/* 投資指標 */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-blue-600">ROE</div>
                    <div className="text-lg sm:text-2xl font-bold text-blue-800">
                      {financialSummary.roe !== null ? `${financialSummary.roe.toFixed(1)}%` : '-'}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-green-600">EPS</div>
                    <div className="text-lg sm:text-2xl font-bold text-green-800">
                      {financialSummary.eps !== null ? `¥${financialSummary.eps.toFixed(0)}` : '-'}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <div className="text-xs sm:text-sm text-purple-600">BPS</div>
                    <div className="text-lg sm:text-2xl font-bold text-purple-800">
                      {financialSummary.bps !== null ? `¥${financialSummary.bps.toFixed(0)}` : '-'}
                    </div>
                  </div>
                </div>

                {/* 売上・利益推移グラフ */}
                {financialTrend && financialTrend.years.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">売上高・純利益推移</h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                      <div className="h-36 sm:h-48 flex items-end gap-1 sm:gap-2 min-w-[300px]">
                        {financialTrend.years.map((year, index) => {
                          const revenue = financialTrend.revenue[index]
                          const netIncome = financialTrend.net_income[index]
                          const maxRevenue = Math.max(...financialTrend.revenue.filter((v): v is number => v !== null))

                          return (
                            <div key={year} className="flex-1 flex flex-col items-center min-w-[28px]">
                              <div className="w-full flex items-end justify-center gap-0.5 h-28 sm:h-36">
                                {/* 売上高バー */}
                                <div
                                  className="w-2 sm:w-3 bg-blue-400 rounded-t"
                                  style={{
                                    height: revenue ? `${(revenue / maxRevenue) * 100}%` : '0%'
                                  }}
                                  title={`売上高: ${formatAmount(revenue)}`}
                                />
                                {/* 純利益バー */}
                                <div
                                  className="w-2 sm:w-3 bg-green-400 rounded-t"
                                  style={{
                                    height: netIncome && revenue ? `${(netIncome / maxRevenue) * 100}%` : '0%'
                                  }}
                                  title={`純利益: ${formatAmount(netIncome)}`}
                                />
                              </div>
                              <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{String(year).slice(-2)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-400 rounded mr-1"></div>
                        <span className="text-[10px] sm:text-xs text-gray-500">売上高</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded mr-1"></div>
                        <span className="text-[10px] sm:text-xs text-gray-500">純利益</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-600 mb-2 text-sm sm:text-base">財務データがありません</p>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                  EDINETから有価証券報告書を取得して財務データを追加できます
                </p>
                {fetchFinancialMessage && (
                  <p className="text-blue-600 mb-4 text-sm">{fetchFinancialMessage}</p>
                )}
                <button
                  onClick={fetchFinancialData}
                  disabled={isFetchingFinancial}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 font-medium text-sm sm:text-base"
                >
                  {isFetchingFinancial ? '取得中...' : 'EDINETからデータを取得'}
                </button>
              </div>
            )}
          </div>

          {/* AI分析レポート */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">AI分析レポート</h2>

            {!report && !isGenerating && (
              <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
                  AIによる詳細な企業分析レポートを生成します
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
                  株価データと財務データを分析し、
                  <br className="hidden sm:block" />
                  Gemini AI による投資分析レポートを作成します
                </p>
                {reportError && (
                  <p className="text-red-500 mb-4 text-sm">{reportError}</p>
                )}
                <button
                  onClick={generateReport}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-sm sm:text-base"
                >
                  分析を開始
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm sm:text-base">AI分析レポートを生成中...</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-2">30秒〜1分程度かかります</p>
              </div>
            )}

            {report && (
              <div className="space-y-4 sm:space-y-6">
                {/* サマリー */}
                {report.summary && (
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">サマリー</h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{report.summary}</p>
                  </div>
                )}

                {/* 企業特徴 */}
                {report.features && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">企業特徴・強み</h3>
                    <p className="text-gray-600 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{report.features}</p>
                  </div>
                )}

                {/* 予測・見通し */}
                {report.prediction && (
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">今後の予測・見通し</h3>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{report.prediction}</p>
                  </div>
                )}

                {/* 分析根拠 */}
                {report.reasoning && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">分析根拠</h3>
                    <p className="text-gray-600 whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{report.reasoning}</p>
                  </div>
                )}

                {/* 免責事項 */}
                <div className="border-t pt-4 mt-4 sm:mt-6">
                  <p className="text-[10px] sm:text-xs text-gray-400 leading-relaxed">
                    ※このレポートは情報提供のみを目的としており、投資助言ではありません。
                    投資判断は必ずご自身の責任で行ってください。
                  </p>
                </div>

                {/* 再生成ボタン */}
                <div className="text-center">
                  <button
                    onClick={generateReport}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 active:text-blue-900"
                  >
                    レポートを再生成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
