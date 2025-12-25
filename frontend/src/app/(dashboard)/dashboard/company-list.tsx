'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api, Company } from '@/lib/api'

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSector, setSelectedSector] = useState<string>('all')

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      setIsLoading(true)
      const data = await api.getCompanies({ limit: 100 })
      setCompanies(data.companies)
    } catch (err) {
      console.error('企業一覧の取得エラー:', err)
      setError('企業一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // セクター一覧を取得
  const sectors: string[] = ['all', ...new Set(companies.map(c => c.sector).filter((s): s is string => s !== null))]

  // フィルタリング
  const filteredCompanies = selectedSector === 'all'
    ? companies
    : companies.filter(c => c.sector === selectedSector)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">登録企業一覧</h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">登録企業一覧</h2>
        <div className="text-red-500 text-center py-4">{error}</div>
        <button
          onClick={loadCompanies}
          className="block mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">登録企業一覧</h2>
        <span className="text-sm text-gray-500">{filteredCompanies.length} 件</span>
      </div>

      {/* セクターフィルター */}
      <div className="mb-4">
        <select
          value={selectedSector}
          onChange={(e) => setSelectedSector(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector === 'all' ? 'すべてのセクター' : sector}
            </option>
          ))}
        </select>
      </div>

      {/* 企業一覧テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                コード
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                企業名
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                セクター
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                市場
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono text-blue-600">{company.code}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-gray-900">{company.name}</div>
                    {company.name_en && (
                      <div className="text-sm text-gray-500">{company.name_en}</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {company.sector || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {company.market || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link
                    href={`/analysis/${company.code}`}
                    className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    分析
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCompanies.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          該当する企業がありません
        </div>
      )}
    </div>
  )
}
