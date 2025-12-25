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
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">ウォッチリスト</h2>
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">ウォッチリスト</h2>
        <Link
          href="/watchlist"
          className="text-sm text-blue-600 hover:text-blue-800 active:text-blue-900 flex items-center gap-1 px-2 py-1 -mr-2 rounded hover:bg-blue-50"
        >
          管理
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {watchlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {watchlist.map((item) => (
            <Link
              key={item.company_code}
              href={`/analysis/${item.company_code}`}
              className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-300 hover:shadow-md active:bg-gray-50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-blue-600 font-medium text-sm sm:text-base">
                    {item.company_code}
                  </div>
                  <div className="font-medium text-gray-900 text-sm sm:text-base truncate">
                    {item.company_name}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    {item.sector || '-'}
                  </div>
                </div>
                <span className="text-yellow-500 text-base sm:text-lg ml-2">★</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 sm:py-10 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-base font-medium">ウォッチリストは空です</p>
          <p className="text-sm mt-1">企業分析ページから銘柄を追加できます</p>
        </div>
      )}
    </div>
  )
}
