'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { useState, useEffect } from 'react'

export default function Home() {
  const { user, loading } = useAuth()
  const [siteUrl, setSiteUrl] = useState('')

  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
            10年分のデータで
            <br />
            <span className="text-blue-600">未来を予測する</span>
          </h2>
          <p className="mt-4 sm:mt-6 text-base sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            過去10年の財務データと株価の相関をAIが分析。
            機関投資家レベルの分析レポートをワンクリックで生成。
          </p>
          <div className="mt-8 sm:mt-10">
            {loading ? (
              <div className="inline-block px-6 py-3 sm:px-8 sm:py-4 bg-gray-300 text-gray-500 text-base sm:text-lg font-medium rounded-lg">
                読み込み中...
              </div>
            ) : user ? (
              <Link
                href="/dashboard"
                className="inline-block w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl transition-all"
              >
                ダッシュボードへ
              </Link>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 text-white text-base sm:text-lg font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl transition-all text-center"
                >
                  無料でアカウント作成
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-3 sm:px-8 sm:py-4 bg-white text-blue-600 text-base sm:text-lg font-medium rounded-lg border-2 border-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-all text-center"
                >
                  ログイン
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">10年分の財務データ</h3>
            <p className="text-sm sm:text-base text-gray-600">
              EDINETから取得した有価証券報告書を自動解析。PL/BS/CFを一目で把握。
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">株価との相関分析</h3>
            <p className="text-sm sm:text-base text-gray-600">
              業績と株価の連動性を可視化。決算発表時の株価反応パターンを分析。
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">AI予測レポート</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Gemini AIが過去データを分析し、今後のシナリオと根拠を提示。
            </p>
          </div>
        </div>

        {/* Target Users Section */}
        <div className="mt-16 sm:mt-24 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8">
            こんな方におすすめ
          </h3>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 px-2">
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-sm sm:text-base font-medium">
              長期投資家
            </span>
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-sm sm:text-base font-medium">
              ファンダメンタル分析派
            </span>
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-sm sm:text-base font-medium">
              企業研究者
            </span>
            <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-sm sm:text-base font-medium">
              コンサルタント
            </span>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="mt-16 sm:mt-24">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 max-w-md mx-auto text-center">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              スマホでもアクセス
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              QRコードを読み取って、いつでもどこでも分析
            </p>
            {siteUrl && (
              <div className="inline-block p-4 bg-white rounded-xl border-2 border-gray-100">
                <QRCodeSVG
                  value={siteUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#1e40af"
                />
              </div>
            )}
            <p className="mt-4 text-xs text-gray-500 break-all">
              {siteUrl}
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
          <p className="text-center text-xs sm:text-sm leading-relaxed">
            ※本サービスはAIによる過去データの統計的分析であり、将来の成果を保証するものではありません。
            投資判断は自己責任でお願いいたします。
          </p>
          <p className="text-center text-xs sm:text-sm mt-4">
            &copy; 2025 株式分析AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
