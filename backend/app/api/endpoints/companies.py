from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.services.database.supabase_client import supabase_service
from app.services.stock.fetcher import stock_fetcher

router = APIRouter()


@router.get("/")
async def list_companies(
    limit: int = Query(default=100, le=500),
    search: Optional[str] = None
):
    """
    企業一覧を取得

    - **limit**: 取得件数（最大500）
    - **search**: 検索クエリ（証券コードまたは企業名）
    """
    if search:
        companies = supabase_service.search_companies(search, limit)
    else:
        companies = supabase_service.get_all_companies(limit)

    return {"companies": companies, "count": len(companies)}


@router.get("/{code}")
async def get_company(code: str):
    """
    企業詳細を取得

    - **code**: 証券コード（例: 7203）
    """
    company = supabase_service.get_company_by_code(code)

    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    return company


@router.get("/{code}/stock-prices")
async def get_company_stock_prices(
    code: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    fetch_latest: bool = Query(default=False, description="最新データを取得するか")
):
    """
    企業の株価データを取得

    - **code**: 証券コード
    - **start_date**: 開始日（YYYY-MM-DD）
    - **end_date**: 終了日（YYYY-MM-DD）
    - **fetch_latest**: True の場合、外部APIから最新データを取得
    """
    # 企業の存在確認
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    # DBから株価データを取得
    stock_prices = supabase_service.get_stock_prices(
        company["id"],
        start_date,
        end_date
    )

    # データがない場合、または fetch_latest が True の場合は外部APIから取得
    if fetch_latest or not stock_prices:
        df = stock_fetcher.fetch_stock_data(code, years=10)

        if df is not None and not df.empty:
            # DataFrameをDBに保存する形式に変換
            prices_to_save = []
            for _, row in df.iterrows():
                price_data = {
                    "company_id": company["id"],
                    "date": row["date"].strftime("%Y-%m-%d") if hasattr(row["date"], "strftime") else str(row["date"]),
                    "open_price": float(row["open_price"]) if "open_price" in row and row["open_price"] else None,
                    "high_price": float(row["high_price"]) if "high_price" in row and row["high_price"] else None,
                    "low_price": float(row["low_price"]) if "low_price" in row and row["low_price"] else None,
                    "close_price": float(row["close_price"]),
                    "volume": int(row["volume"]) if "volume" in row and row["volume"] else None,
                }
                prices_to_save.append(price_data)

            # DBに保存
            if prices_to_save:
                inserted = supabase_service.bulk_insert_stock_prices(prices_to_save)
                # 保存後、DBから再取得
                stock_prices = supabase_service.get_stock_prices(
                    company["id"],
                    start_date,
                    end_date
                )

    return {
        "code": code,
        "company_name": company["name"],
        "stock_prices": stock_prices,
        "count": len(stock_prices)
    }


@router.get("/{code}/financials")
async def get_company_financials(
    code: str,
    fiscal_year: Optional[int] = None
):
    """
    企業の財務データを取得

    - **code**: 証券コード
    - **fiscal_year**: 会計年度（指定しない場合は全期間）
    """
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    financials = supabase_service.get_financial_statements(
        company["id"],
        fiscal_year
    )

    return {
        "code": code,
        "company_name": company["name"],
        "financials": financials,
        "count": len(financials)
    }


@router.get("/{code}/latest-price")
async def get_latest_price(code: str):
    """
    企業の最新株価を取得（外部APIから直接取得）

    - **code**: 証券コード
    """
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    latest = stock_fetcher.get_latest_price(code)

    if not latest:
        raise HTTPException(status_code=503, detail="株価データの取得に失敗しました")

    return {
        "code": code,
        "company_name": company["name"],
        **latest
    }
