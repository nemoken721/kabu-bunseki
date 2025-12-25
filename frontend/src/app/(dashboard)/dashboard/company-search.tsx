'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, Company } from '@/lib/api'

export default function CompanySearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const data = await api.searchCompanies(searchQuery, 10)
      setResults(data.companies)
    } catch (error) {
      console.error('検索エラー:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCompanies(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, searchCompanies])

  const handleSelect = (company: Company) => {
    setShowResults(false)
    setQuery('')
    router.push(`/analysis/${company.code}`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 relative">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">銘柄検索</h2>
      <div className="relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            placeholder="銘柄コード or 企業名（例: 7203）"
            className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* 検索結果ドロップダウン */}
        {showResults && (query.trim() || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span>検索中...</span>
              </div>
            ) : results.length > 0 ? (
              results.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className="w-full px-4 py-3 sm:py-4 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-start sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-blue-600 font-medium">{company.code}</span>
                        <span className="font-medium text-gray-900 truncate">{company.name}</span>
                      </div>
                      {company.name_en && (
                        <div className="text-sm text-gray-400 mt-0.5 truncate">{company.name_en}</div>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded shrink-0">
                      {company.sector || '-'}
                    </span>
                  </div>
                </button>
              ))
            ) : query.trim() ? (
              <div className="p-6 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>該当する企業が見つかりません</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* クリックで閉じる */}
      {showResults && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
