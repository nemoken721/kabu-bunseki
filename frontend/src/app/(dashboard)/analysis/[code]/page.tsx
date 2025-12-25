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
  business_analysis: string
  financial_analysis: string
  stock_analysis: string
  risk_factors: string
  outlook: string
  full_report: string
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-xl text-gray-600">データを読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-500 text-xl mb-4">{error || '企業が見つかりません'}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <span className="font-mono text-blue-600 mr-2">{company.code}</span>
                  {company.name}
                </h1>
                {company.name_en && (
                  <p className="text-sm text-gray-500">{company.name_en}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                {company.sector}
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                {company.market}
              </span>
              {user && (
                <button
                  onClick={toggleWatchlist}
                  disabled={watchlistLoading}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    isInWatchlist
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {watchlistLoading ? '...' : isInWatchlist ? '★ ウォッチ中' : '☆ ウォッチ'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 株価サマリー */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">最新株価</h2>
            {latestPrice ? (
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  ¥{latestPrice.close_price?.toLocaleString() || '-'}
                </div>
                {priceChange !== null && (
                  <div className={`text-lg ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  {latestPrice.date ? new Date(latestPrice.date).toLocaleDateString('ja-JP') : '-'}
                </div>
                <div className="mt-4 text-sm">
                  <div>
                    <span className="text-gray-500">出来高</span>
                    <div className="font-medium">{latestPrice.volume?.toLocaleString() || '-'} 株</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">株価データがありません</div>
            )}
          </div>

          {/* 株価チャート */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">株価推移（過去1年）</h2>
            <StockChart stockPrices={stockPrices} companyName={company.name} />
            {stockPrices.length > 0 && (
              <p className="text-sm text-gray-500 mt-4">
                データ件数: {stockPrices.length} 日分
              </p>
            )}
          </div>

          {/* 財務データ（10年推移） */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">財務データ（10年推移）</h2>
              {latestFiscalYear && (
                <span className="text-sm text-gray-500">
                  最新: {latestFiscalYear}年度 / {financialDataPoints}年分のデータ
                </span>
              )}
            </div>

            {financialSummary ? (
              <div className="space-y-6">
                {/* 主要指標サマリー */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">売上高</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.revenue)}
                    </div>
                    {financialSummary.revenue_growth !== null && (
                      <div className={`text-sm ${financialSummary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        前年比 {financialSummary.revenue_growth >= 0 ? '+' : ''}{financialSummary.revenue_growth}%
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">営業利益</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.operating_income)}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">純利益</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.net_income)}
                    </div>
                    {financialSummary.profit_growth !== null && (
                      <div className={`text-sm ${financialSummary.profit_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        前年比 {financialSummary.profit_growth >= 0 ? '+' : ''}{financialSummary.profit_growth}%
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">総資産</div>
                    <div className="text-xl font-bold text-gray-900">
                      {formatAmount(financialSummary.total_assets)}
                    </div>
                  </div>
                </div>

                {/* 投資指標 */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600">ROE（自己資本利益率）</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {financialSummary.roe !== null ? `${financialSummary.roe.toFixed(1)}%` : '-'}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600">EPS（1株利益）</div>
                    <div className="text-2xl font-bold text-green-800">
                      {financialSummary.eps !== null ? `¥${financialSummary.eps.toFixed(0)}` : '-'}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600">BPS（1株純資産）</div>
                    <div className="text-2xl font-bold text-purple-800">
                      {financialSummary.bps !== null ? `¥${financialSummary.bps.toFixed(0)}` : '-'}
                    </div>
                  </div>
                </div>

                {/* 売上・利益推移グラフ */}
                {financialTrend && financialTrend.years.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">売上高・純利益推移</h3>
                    <div className="h-48 flex items-end space-x-2">
                      {financialTrend.years.map((year, index) => {
                        const revenue = financialTrend.revenue[index]
                        const netIncome = financialTrend.net_income[index]
                        const maxRevenue = Math.max(...financialTrend.revenue.filter((v): v is number => v !== null))

                        return (
                          <div key={year} className="flex-1 flex flex-col items-center">
                            <div className="w-full flex items-end justify-center space-x-1 h-36">
                              {/* 売上高バー */}
                              <div
                                className="w-3 bg-blue-400 rounded-t"
                                style={{
                                  height: revenue ? `${(revenue / maxRevenue) * 100}%` : '0%'
                                }}
                                title={`売上高: ${formatAmount(revenue)}`}
                              />
                              {/* 純利益バー */}
                              <div
                                className="w-3 bg-green-400 rounded-t"
                                style={{
                                  height: netIncome && revenue ? `${(netIncome / maxRevenue) * 100}%` : '0%'
                                }}
                                title={`純利益: ${formatAmount(netIncome)}`}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{year}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-center space-x-4 mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-400 rounded mr-1"></div>
                        <span className="text-xs text-gray-500">売上高</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-400 rounded mr-1"></div>
                        <span className="text-xs text-gray-500">純利益</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">📊</div>
                <p className="text-gray-600 mb-2">財務データがありません</p>
                <p className="text-sm text-gray-500 mb-4">
                  EDINETから有価証券報告書を取得して財務データを追加できます
                </p>
                {fetchFinancialMessage && (
                  <p className="text-blue-600 mb-4">{fetchFinancialMessage}</p>
                )}
                <button
                  onClick={fetchFinancialData}
                  disabled={isFetchingFinancial}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isFetchingFinancial ? '取得中...' : 'EDINETからデータを取得'}
                </button>
              </div>
            )}
          </div>

          {/* AI分析レポート */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">AI分析レポート</h2>

            {!report && !isGenerating && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="text-gray-400 text-5xl mb-4">🤖</div>
                <p className="text-gray-600 mb-4">
                  AIによる詳細な企業分析レポートを生成します
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  株価データと財務データを分析し、<br />
                  Gemini AI による投資分析レポートを作成します
                </p>
                {reportError && (
                  <p className="text-red-500 mb-4">{reportError}</p>
                )}
                <button
                  onClick={generateReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  分析を開始
                </button>
              </div>
            )}

            {isGenerating && (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">AI分析レポートを生成中...</p>
                <p className="text-sm text-gray-500 mt-2">30秒〜1分程度かかります</p>
              </div>
            )}

            {report && (
              <div className="space-y-6">
                {/* サマリー */}
                {report.summary && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">サマリー</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{report.summary}</p>
                  </div>
                )}

                {/* 事業分析 */}
                {report.business_analysis && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">事業分析</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{report.business_analysis}</p>
                  </div>
                )}

                {/* 財務分析 */}
                {report.financial_analysis && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">財務分析</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{report.financial_analysis}</p>
                  </div>
                )}

                {/* 株価分析 */}
                {report.stock_analysis && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">株価分析</h3>
                    <p className="text-gray-600 whitespace-pre-wrap">{report.stock_analysis}</p>
                  </div>
                )}

                {/* リスク要因 */}
                {report.risk_factors && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-800 mb-2">リスク要因</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{report.risk_factors}</p>
                  </div>
                )}

                {/* 今後の見通し */}
                {report.outlook && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">今後の見通し</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{report.outlook}</p>
                  </div>
                )}

                {/* 免責事項 */}
                <div className="border-t pt-4 mt-6">
                  <p className="text-xs text-gray-400">
                    ※このレポートは情報提供のみを目的としており、投資助言ではありません。
                    投資判断は必ずご自身の責任で行ってください。
                  </p>
                </div>

                {/* 再生成ボタン */}
                <div className="text-center">
                  <button
                    onClick={generateReport}
                    className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
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
