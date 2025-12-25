'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface WatchlistItem {
  company_code: string
  company_name: string
  sector: string | null
  market: string | null
  added_at: string
}

export default function WatchlistSection() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadWatchlist()
  }, [])

  const loadWatchlist = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setIsLoading(false)
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/watchlist`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setWatchlist(data.watchlist || [])
      }
    } catch (err) {
      console.error('Watchlist load error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ウォッチリスト</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">ウォッチリスト</h2>
        <Link
          href="/watchlist"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          管理 →
        </Link>
      </div>

      {watchlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            <Link
              key={item.company_code}
              href={`/analysis/${item.company_code}`}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-blue-600 font-medium">
                    {item.company_code}
                  </div>
                  <div className="font-medium text-gray-900">
                    {item.company_name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.sector || '-'}
                  </div>
                </div>
                <span className="text-yellow-500 text-lg">★</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p>ウォッチリストは空です</p>
          <p className="text-sm mt-1">企業分析ページから銘柄を追加できます</p>
        </div>
      )}
    </div>
  )
}
