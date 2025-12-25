'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            10年分のデータで
            <br />
            <span className="text-blue-600">未来を予測する</span>
          </h2>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            過去10年の財務データと株価の相関をAIが分析。
            機関投資家レベルの分析レポートをワンクリックで生成。
          </p>
          <div className="mt-10">
            {loading ? (
              <div className="inline-block px-8 py-4 bg-gray-300 text-gray-500 text-lg font-medium rounded-lg">
                読み込み中...
              </div>
            ) : user ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
              >
                ダッシュボードへ
              </Link>
            ) : (
              <Link
                href="/signup"
                className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
              >
                無料でアカウント作成
              </Link>
            )}
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">10年分の財務データ</h3>
            <p className="text-gray-600">
              EDINETから取得した有価証券報告書を自動解析。PL/BS/CFを一目で把握。
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-3xl mb-4">📈</div>
            <h3 className="text-xl font-semibold mb-2">株価との相関分析</h3>
            <p className="text-gray-600">
              業績と株価の連動性を可視化。決算発表時の株価反応パターンを分析。
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI予測レポート</h3>
            <p className="text-gray-600">
              Gemini AIが過去データを分析し、今後のシナリオと根拠を提示。
            </p>
          </div>
        </div>

        <div className="mt-24 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            こんな方におすすめ
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              長期投資家
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              ファンダメンタル分析派
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              企業研究者
            </span>
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full">
              コンサルタント
            </span>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 mt-24">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-center text-sm">
            ※本サービスはAIによる過去データの統計的分析であり、将来の成果を保証するものではありません。
            投資判断は自己責任でお願いいたします。
          </p>
          <p className="text-center text-sm mt-4">
            &copy; 2025 株式分析AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
