'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useRef } from 'react'

export default function Header() {
  const { user, loading, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = async () => {
    await signOut()
    setIsMenuOpen(false)
    setIsMobileMenuOpen(false)
  }

  // クリック外で閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-lg sm:text-xl font-bold text-blue-600">株式分析</span>
              <span className="hidden sm:inline ml-2 text-sm text-gray-500">10年長期分析＆AI予測</span>
            </Link>
          </div>

          {/* デスクトップナビ */}
          <nav className="hidden md:flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
            >
              ダッシュボード
            </Link>

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b truncate">
                      {user.email}
                    </div>
                    <Link
                      href="/watchlist"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      ウォッチリスト
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  登録
                </Link>
              </div>
            )}
          </nav>

          {/* モバイルハンバーガーメニュー */}
          <div className="md:hidden flex items-center" ref={mobileMenuRef}>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              aria-label="メニュー"
            >
              {isMobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white pb-4">
            <div className="pt-2 space-y-1">
              <Link
                href="/dashboard"
                className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                ダッシュボード
              </Link>

              {loading ? (
                <div className="px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                </div>
              ) : user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-500 border-t border-b bg-gray-50">
                    {user.email}
                  </div>
                  <Link
                    href="/watchlist"
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ウォッチリスト
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50 active:bg-red-100"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <div className="px-4 pt-2 space-y-2">
                  <Link
                    href="/login"
                    className="block w-full px-4 py-3 text-center text-base font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/signup"
                    className="block w-full px-4 py-3 text-center text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    無料登録
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
