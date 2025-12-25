import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'
import CompanySearch from './company-search'
import WatchlistSection from './watchlist-section'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              株式分析ダッシュボード
            </h1>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[180px] sm:max-w-none">
                {user.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-8 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <CompanySearch />
        <WatchlistSection />
      </main>
    </div>
  )
}
