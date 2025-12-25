/**
 * バックエンド API クライアント
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Company {
  id: string
  code: string
  name: string
  name_en: string | null
  sector: string | null
  market: string | null
  edinet_code: string | null
  accounting_standard: string | null
  fiscal_year_end: string | null
  created_at: string
  updated_at: string
}

export interface StockPrice {
  id: string
  company_id: string
  date: string
  open_price: number | null
  high_price: number | null
  low_price: number | null
  close_price: number
  adjusted_close: number | null
  volume: number | null
  created_at: string
}

export interface FinancialStatement {
  id: string
  company_id: string
  fiscal_year: number
  fiscal_period: string
  accounting_standard: string | null
  revenue: number | null
  operating_income: number | null
  ordinary_income: number | null
  net_income: number | null
  total_assets: number | null
  total_liabilities: number | null
  shareholders_equity: number | null
  operating_cf: number | null
  investing_cf: number | null
  financing_cf: number | null
  eps: number | null
  bps: number | null
  roe: number | null
  roa: number | null
  mda_summary: string | null
  created_at: string
  updated_at: string
}

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  // ===== Companies =====
  async getCompanies(params?: { limit?: number; search?: string }): Promise<{ companies: Company[]; count: number }> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return this.fetch(`/api/companies/${query ? `?${query}` : ''}`)
  }

  async getCompany(code: string): Promise<Company> {
    return this.fetch(`/api/companies/${code}`)
  }

  async searchCompanies(query: string, limit = 20): Promise<{ companies: Company[]; count: number }> {
    return this.getCompanies({ search: query, limit })
  }

  // ===== Stock Prices =====
  async getStockPrices(
    code: string,
    params?: { start_date?: string; end_date?: string; fetch_latest?: boolean }
  ): Promise<{ code: string; company_name: string; stock_prices: StockPrice[]; count: number }> {
    const searchParams = new URLSearchParams()
    if (params?.start_date) searchParams.set('start_date', params.start_date)
    if (params?.end_date) searchParams.set('end_date', params.end_date)
    if (params?.fetch_latest) searchParams.set('fetch_latest', 'true')

    const query = searchParams.toString()
    return this.fetch(`/api/companies/${code}/stock-prices${query ? `?${query}` : ''}`)
  }

  async getLatestPrice(code: string): Promise<{ code: string; company_name: string; date: string; close_price: number; volume: number | null }> {
    return this.fetch(`/api/companies/${code}/latest-price`)
  }

  // ===== Financials =====
  async getFinancials(
    code: string,
    fiscalYear?: number
  ): Promise<{ code: string; company_name: string; financials: FinancialStatement[]; count: number }> {
    const searchParams = new URLSearchParams()
    if (fiscalYear) searchParams.set('fiscal_year', fiscalYear.toString())

    const query = searchParams.toString()
    return this.fetch(`/api/companies/${code}/financials${query ? `?${query}` : ''}`)
  }

  async getFinancialStatements(
    code: string,
    years: number = 10
  ): Promise<{
    code: string
    company_name: string
    financial_statements: FinancialStatement[]
    count: number
    years_covered: number
  }> {
    return this.fetch(`/api/financial/${code}/financial-statements?years=${years}`)
  }

  async getFinancialSummary(code: string): Promise<{
    code: string
    company_name: string
    latest_fiscal_year: number | null
    summary: {
      revenue: number | null
      operating_income: number | null
      net_income: number | null
      total_assets: number | null
      roe: number | null
      eps: number | null
      bps: number | null
      revenue_growth: number | null
      profit_growth: number | null
    } | null
    trend: {
      years: number[]
      revenue: (number | null)[]
      operating_income: (number | null)[]
      net_income: (number | null)[]
      total_assets: (number | null)[]
      roe: (number | null)[]
    }
    data_points: number
  }> {
    return this.fetch(`/api/financial/${code}/financial-summary`)
  }

  async fetchFinancialData(
    code: string,
    years: number = 10
  ): Promise<{ message: string; code: string; company_name: string; status: string }> {
    return this.fetch(`/api/financial/${code}/fetch-financial-data?years=${years}`, {
      method: 'POST',
    })
  }

  // ===== Analysis =====
  async generateReport(code: string): Promise<{
    code: string
    report: {
      summary: string
      features: string
      prediction: string
      reasoning: string
    }
    generated_at: string
  }> {
    return this.fetch(`/api/analysis/${code}/generate-report`, { method: 'POST' })
  }

  async getReports(code: string): Promise<{ code: string; reports: unknown[] }> {
    return this.fetch(`/api/analysis/${code}/reports`)
  }
}

export const api = new ApiClient()
