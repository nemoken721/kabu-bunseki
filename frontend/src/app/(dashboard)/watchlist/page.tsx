'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'

interface WatchlistItem {
  id: string
  company_code: string
  company_name: string
  sector: string
  notes: string | null
  added_at: string
  latest_price: number | null
  price_date: string | null
}

export default function WatchlistPage() {
  const { user, session, loading: authLoading } = useAuth()
  const router = useRouter()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (session) {
      loadWatchlist()
    }
  }, [session])

  const loadWatchlist = async () => {
    if (!session) return

    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('ウォッチリストの取得に失敗しました')
      }

      const data = await response.json()
      setWatchlist(data.watchlist || [])
    } catch (err) {
      console.error('Watchlist error:', err)
      setError('ウォッチリストの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const removeFromWatchlist = async (companyCode: string) => {
    if (!session) return

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/${companyCode}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      if (response.ok) {
        setWatchlist(prev => prev.filter(item => item.company_code !== companyCode))
      }
    } catch (err) {
      console.error('Remove error:', err)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">読み込み中...</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ウォッチリスト</h1>
          <p className="mt-1 text-sm text-gray-500">
            気になる銘柄を管理できます
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-500">読み込み中...</p>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ウォッチリストは空です
            </h3>
            <p className="text-gray-500 mb-4">
              企業分析ページから銘柄を追加できます
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              企業を探す
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    銘柄
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    セクター
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    株価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メモ
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {watchlist.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/analysis/${item.company_code}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <div className="font-medium">{item.company_name}</div>
                        <div className="text-sm text-gray-500">{item.company_code}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sector || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.latest_price ? (
                        <div>
                          <div className="font-medium">¥{item.latest_price.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">{item.price_date}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {item.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/analysis/${item.company_code}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        分析
                      </Link>
                      <button
                        onClick={() => removeFromWatchlist(item.company_code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
