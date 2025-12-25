"""
財務データAPI エンドポイント
EDINET連携と10年長期分析
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from app.services.database.supabase_client import supabase_service
from app.services.external.edinet_client import edinet_client

router = APIRouter()


class FinancialDataResponse(BaseModel):
    """財務データレスポンス"""
    fiscal_year: int
    fiscal_period: str
    accounting_standard: Optional[str] = None
    revenue: Optional[int] = None
    operating_income: Optional[int] = None
    ordinary_income: Optional[int] = None
    net_income: Optional[int] = None
    total_assets: Optional[int] = None
    net_assets: Optional[int] = None
    shareholders_equity: Optional[int] = None
    operating_cf: Optional[int] = None
    investing_cf: Optional[int] = None
    financing_cf: Optional[int] = None
    eps: Optional[float] = None
    bps: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None


@router.get("/{code}/financial-statements")
async def get_financial_statements(
    code: str,
    years: int = 10
):
    """
    企業の財務データを取得（過去N年分）

    - **code**: 証券コード
    - **years**: 取得年数（デフォルト10年）
    """
    # 企業情報を取得
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    # DBから財務データを取得
    financial_data = supabase_service.get_financial_statements(company["id"])

    # 年度でフィルタリング
    current_year = datetime.now().year
    min_year = current_year - years

    filtered_data = [
        f for f in financial_data
        if f.get("fiscal_year", 0) >= min_year
    ]

    return {
        "code": code,
        "company_name": company["name"],
        "financial_statements": filtered_data,
        "count": len(filtered_data),
        "years_covered": years,
    }


@router.post("/{code}/fetch-financial-data")
async def fetch_financial_data(
    code: str,
    background_tasks: BackgroundTasks,
    years: int = 10
):
    """
    EDINETから財務データを取得してDBに保存

    - **code**: 証券コード
    - **years**: 取得年数（デフォルト10年）

    注意: EDINET APIの制限により、大量の年度を取得する場合は時間がかかります
    """
    # 企業情報を取得
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    # バックグラウンドで財務データを取得
    background_tasks.add_task(
        _fetch_and_save_financial_data,
        company,
        code,
        years
    )

    return {
        "message": f"財務データの取得を開始しました（過去{years}年分）",
        "code": code,
        "company_name": company["name"],
        "status": "processing",
    }


async def _fetch_and_save_financial_data(company: dict, code: str, years: int):
    """
    EDINETから財務データを取得してDBに保存（バックグラウンドタスク）
    """
    try:
        edinet_code = company.get("edinet_code")
        if not edinet_code:
            print(f"EDINET code not found for {code}")
            return

        # EDINETから財務サマリーを取得
        financial_summaries = edinet_client.get_financial_summary(edinet_code, years=years)

        print(f"Found {len(financial_summaries)} years of financial data for {code}")

        for financial_data in financial_summaries:
            try:
                # DBに保存
                data = {
                    "company_id": company["id"],
                    "fiscal_year": financial_data.get("fiscal_year"),
                    "fiscal_period": financial_data.get("fiscal_period", "FY"),
                    "revenue": financial_data.get("revenue"),
                    "operating_income": financial_data.get("operating_income"),
                    "net_income": financial_data.get("net_income"),
                    "total_assets": financial_data.get("total_assets"),
                    "shareholders_equity": financial_data.get("shareholders_equity"),
                }
                supabase_service.upsert_financial_statement(data)
                print(f"Saved financial data for {code} FY{financial_data.get('fiscal_year')}")

            except Exception as e:
                print(f"Error saving financial data: {e}")
                continue

    except Exception as e:
        print(f"Error fetching financial data for {code}: {e}")


@router.get("/{code}/financial-summary")
async def get_financial_summary(code: str):
    """
    企業の財務サマリーを取得（グラフ表示用）

    - **code**: 証券コード
    """
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    financial_data = supabase_service.get_financial_statements(company["id"])

    if not financial_data:
        return {
            "code": code,
            "company_name": company["name"],
            "summary": None,
            "message": "財務データがありません",
        }

    # 年度順にソート
    sorted_data = sorted(financial_data, key=lambda x: x.get("fiscal_year", 0))

    # サマリーを計算
    latest = sorted_data[-1] if sorted_data else None

    # 成長率の計算
    revenue_growth = None
    profit_growth = None

    if len(sorted_data) >= 2:
        prev = sorted_data[-2]
        if latest.get("revenue") and prev.get("revenue"):
            revenue_growth = round(
                (latest["revenue"] - prev["revenue"]) / prev["revenue"] * 100, 1
            )
        if latest.get("net_income") and prev.get("net_income") and prev["net_income"] > 0:
            profit_growth = round(
                (latest["net_income"] - prev["net_income"]) / prev["net_income"] * 100, 1
            )

    # ROEを計算（DBに値がなくても計算）
    def calc_roe(data):
        if data.get("roe"):
            return data["roe"]
        if data.get("net_income") and data.get("shareholders_equity") and data["shareholders_equity"] > 0:
            return round(data["net_income"] / data["shareholders_equity"] * 100, 1)
        return None

    # 10年間のトレンドデータ
    trend_data = {
        "years": [d.get("fiscal_year") for d in sorted_data],
        "revenue": [d.get("revenue") for d in sorted_data],
        "operating_income": [d.get("operating_income") for d in sorted_data],
        "net_income": [d.get("net_income") for d in sorted_data],
        "total_assets": [d.get("total_assets") for d in sorted_data],
        "roe": [calc_roe(d) for d in sorted_data],
    }

    return {
        "code": code,
        "company_name": company["name"],
        "latest_fiscal_year": latest.get("fiscal_year") if latest else None,
        "summary": {
            "revenue": latest.get("revenue") if latest else None,
            "operating_income": latest.get("operating_income") if latest else None,
            "net_income": latest.get("net_income") if latest else None,
            "total_assets": latest.get("total_assets") if latest else None,
            "roe": calc_roe(latest) if latest else None,
            "eps": latest.get("eps") if latest else None,
            "bps": latest.get("bps") if latest else None,
            "revenue_growth": revenue_growth,
            "profit_growth": profit_growth,
        },
        "trend": trend_data,
        "data_points": len(sorted_data),
    }
