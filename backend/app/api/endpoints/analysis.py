"""
分析API エンドポイント
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.services.database.supabase_client import supabase_service
from app.services.ai.gemini_client import gemini_client

router = APIRouter()


@router.post("/{code}/generate-report")
async def generate_report(code: str):
    """
    AI分析レポートを生成

    - **code**: 証券コード
    """
    # 企業情報を取得
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    # 株価データを取得
    stock_prices = supabase_service.get_stock_prices(company["id"])

    # 株価統計を計算
    stock_data = {}
    if stock_prices:
        prices = [p["close_price"] for p in stock_prices if p.get("close_price")]
        if prices:
            stock_data["latest_price"] = prices[-1] if prices else None
            stock_data["high_52w"] = max(prices[-252:]) if len(prices) > 0 else None
            stock_data["low_52w"] = min(prices[-252:]) if len(prices) > 0 else None
            if len(prices) > 252:
                stock_data["price_change_1y"] = ((prices[-1] - prices[-252]) / prices[-252]) * 100

    # 財務データを取得
    financial_data = supabase_service.get_financial_statements(company["id"])

    # AI分析レポートを生成
    report = gemini_client.generate_analysis_report(
        company_name=company["name"],
        company_code=code,
        stock_data=stock_data,
        financial_data=financial_data,
    )

    # レポートをDBに保存（ai_modelカラムがないためスキップ）
    report_data = {
        "company_id": company["id"],
        "report_type": "ai_analysis",
        "summary": report.get("summary", ""),
        "full_report": report.get("full_report", ""),
    }

    try:
        saved_report = supabase_service.create_analysis_report(report_data)
    except Exception as e:
        print(f"Report save error: {e}")
        saved_report = None

    return {
        "code": code,
        "company_name": company["name"],
        "report": report,
        "report_id": saved_report.get("id") if saved_report else None,
        "generated_at": datetime.now().isoformat(),
    }


@router.get("/{code}/reports")
async def get_reports(code: str):
    """
    過去の分析レポート一覧を取得

    - **code**: 証券コード
    """
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    reports = supabase_service.get_analysis_reports(company["id"])

    return {
        "code": code,
        "company_name": company["name"],
        "reports": reports,
        "count": len(reports),
    }


@router.get("/{code}/reports/{report_id}")
async def get_report(code: str, report_id: str):
    """
    分析レポート詳細を取得

    - **code**: 証券コード
    - **report_id**: レポートID
    """
    company = supabase_service.get_company_by_code(code)
    if not company:
        raise HTTPException(status_code=404, detail=f"企業が見つかりません: {code}")

    report = supabase_service.get_analysis_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"レポートが見つかりません: {report_id}")

    return {
        "code": code,
        "company_name": company["name"],
        "report": report,
    }
