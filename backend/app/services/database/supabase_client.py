"""
Supabase クライアント（Python バックエンド用）
"""

from supabase import create_client, Client
from app.config.settings import get_settings
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_client() -> Client:
    """
    Supabase クライアントを取得（シングルトン）
    """
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ValueError("Supabase の設定が不足しています")

    client = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )

    logger.info("Supabase クライアント初期化完了")
    return client


class SupabaseService:
    """Supabase データベース操作サービス"""

    def __init__(self):
        self.client = get_supabase_client()

    # ===== Companies =====
    def get_company_by_code(self, code: str) -> dict | None:
        """証券コードで企業を取得"""
        response = self.client.table("companies").select("*").eq("code", code).execute()
        if response.data:
            return response.data[0]
        return None

    def get_all_companies(self, limit: int = 100) -> list:
        """企業一覧を取得"""
        response = self.client.table("companies").select("*").limit(limit).execute()
        return response.data or []

    def upsert_company(self, company_data: dict) -> dict:
        """企業情報を登録/更新"""
        response = self.client.table("companies").upsert(
            company_data,
            on_conflict="code"
        ).execute()
        return response.data[0] if response.data else None

    def search_companies(self, query: str, limit: int = 20) -> list:
        """企業を検索（コードまたは名前）"""
        response = self.client.table("companies").select("*").or_(
            f"code.ilike.%{query}%,name.ilike.%{query}%"
        ).limit(limit).execute()
        return response.data or []

    # ===== Stock Prices =====
    def get_stock_prices(
        self,
        company_id: str,
        start_date: str = None,
        end_date: str = None
    ) -> list:
        """株価データを取得"""
        query = self.client.table("stock_prices").select("*").eq("company_id", company_id)

        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)

        query = query.order("date")
        response = query.execute()
        return response.data or []

    def bulk_insert_stock_prices(self, prices: list[dict]) -> int:
        """株価データを一括挿入"""
        if not prices:
            return 0

        # バッチサイズで分割して挿入
        batch_size = 1000
        inserted_count = 0

        for i in range(0, len(prices), batch_size):
            batch = prices[i:i + batch_size]
            try:
                self.client.table("stock_prices").upsert(
                    batch,
                    on_conflict="company_id,date"
                ).execute()
                inserted_count += len(batch)
            except Exception as e:
                logger.error(f"株価データ挿入エラー: {e}")

        return inserted_count

    # ===== Financial Statements =====
    def get_financial_statements(
        self,
        company_id: str,
        fiscal_year: int = None
    ) -> list:
        """財務データを取得"""
        query = self.client.table("financial_statements").select("*").eq("company_id", company_id)

        if fiscal_year:
            query = query.eq("fiscal_year", fiscal_year)

        query = query.order("fiscal_year", desc=True)
        response = query.execute()
        return response.data or []

    def upsert_financial_statement(self, data: dict) -> dict:
        """財務データを登録/更新"""
        response = self.client.table("financial_statements").upsert(
            data,
            on_conflict="company_id,fiscal_year,fiscal_period"
        ).execute()
        return response.data[0] if response.data else None

    # ===== Analysis Reports =====
    def create_analysis_report(self, report_data: dict) -> dict:
        """分析レポートを作成"""
        response = self.client.table("analysis_reports").insert(report_data).execute()
        return response.data[0] if response.data else None

    def get_analysis_reports(
        self,
        company_id: str = None,
        user_id: str = None,
        limit: int = 10
    ) -> list:
        """分析レポートを取得"""
        query = self.client.table("analysis_reports").select("*")

        if company_id:
            query = query.eq("company_id", company_id)
        if user_id:
            query = query.eq("user_id", user_id)

        query = query.order("created_at", desc=True).limit(limit)
        response = query.execute()
        return response.data or []

    def get_cached_report(self, company_id: str, max_age_hours: int = 24) -> dict | None:
        """キャッシュされたレポートを取得"""
        from datetime import datetime, timedelta

        cutoff_time = (datetime.utcnow() - timedelta(hours=max_age_hours)).isoformat()

        response = self.client.table("analysis_reports").select("*").eq(
            "company_id", company_id
        ).gte("created_at", cutoff_time).order("created_at", desc=True).limit(1).execute()

        if response.data:
            return response.data[0]
        return None

    def get_analysis_report(self, report_id: str) -> dict | None:
        """分析レポートを取得（ID指定）"""
        response = self.client.table("analysis_reports").select("*").eq("id", report_id).execute()
        if response.data:
            return response.data[0]
        return None

    # ===== User Watchlists =====
    def get_user_watchlist(self, user_id: str) -> list:
        """ユーザーのウォッチリストを取得"""
        response = self.client.table("user_watchlists").select(
            "*, companies(*)"
        ).eq("user_id", user_id).execute()
        return response.data or []

    def add_to_watchlist(self, user_id: str, company_id: str, notes: str = None) -> dict:
        """ウォッチリストに追加"""
        data = {
            "user_id": user_id,
            "company_id": company_id,
            "notes": notes
        }
        response = self.client.table("user_watchlists").upsert(
            data,
            on_conflict="user_id,company_id"
        ).execute()
        return response.data[0] if response.data else None

    def remove_from_watchlist(self, user_id: str, company_id: str) -> bool:
        """ウォッチリストから削除"""
        response = self.client.table("user_watchlists").delete().eq(
            "user_id", user_id
        ).eq("company_id", company_id).execute()
        return True


# シングルトンインスタンス
supabase_service = SupabaseService()
