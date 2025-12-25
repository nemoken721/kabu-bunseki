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
    <div className="bg-white rounded-lg shadow p-6 relative">
      <h2 className="text-xl font-semibold mb-4">銘柄検索</h2>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          placeholder="銘柄コードまたは企業名を入力（例: 7203, トヨタ）"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* 検索結果ドロップダウン */}
        {showResults && (query.trim() || isLoading) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">検索中...</div>
            ) : results.length > 0 ? (
              results.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelect(company)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-blue-600 mr-2">{company.code}</span>
                      <span className="font-medium">{company.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{company.sector}</span>
                  </div>
                  {company.name_en && (
                    <div className="text-sm text-gray-400 mt-1">{company.name_en}</div>
                  )}
                </button>
              ))
            ) : query.trim() ? (
              <div className="p-4 text-center text-gray-500">
                該当する企業が見つかりません
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* クリックで閉じる */}
      {showResults && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
