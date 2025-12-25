"""
ウォッチリスト API エンドポイント
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from app.services.database.supabase_client import supabase_service
import jwt

router = APIRouter()


class WatchlistAddRequest(BaseModel):
    company_code: str
    notes: Optional[str] = None


class WatchlistUpdateRequest(BaseModel):
    notes: Optional[str] = None


def get_user_id_from_token(authorization: str) -> str:
    """JWTトークンからユーザーIDを取得"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="認証が必要です")

    token = authorization.split(" ")[1]
    try:
        # Supabaseトークンをデコード（検証はSupabaseが行うので署名検証はスキップ）
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="無効なトークンです")
        return user_id
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="無効なトークンです")


@router.get("/")
async def get_watchlist(authorization: str = Header(None)):
    """ウォッチリストを取得"""
    user_id = get_user_id_from_token(authorization)

    watchlist = supabase_service.get_user_watchlist(user_id)

    # 各銘柄の最新株価を取得
    result = []
    for item in watchlist:
        company = item.get("companies", {})
        if company:
            # 最新株価を取得
            stock_prices = supabase_service.get_stock_prices(company["id"])
            latest_price = stock_prices[-1] if stock_prices else None

            result.append({
                "id": item["id"],
                "company_code": company.get("code"),
                "company_name": company.get("name"),
                "sector": company.get("sector"),
                "notes": item.get("notes"),
                "added_at": item.get("created_at"),
                "latest_price": latest_price.get("close") if latest_price else None,
                "price_date": latest_price.get("date") if latest_price else None,
            })

    return {
        "watchlist": result,
        "count": len(result)
    }


@router.post("/add")
async def add_to_watchlist(
    request: WatchlistAddRequest,
    authorization: str = Header(None)
):
    """ウォッチリストに追加"""
    user_id = get_user_id_from_token(authorization)

    # 企業を取得
    company = supabase_service.get_company_by_code(request.company_code)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # ウォッチリストに追加
    result = supabase_service.add_to_watchlist(
        user_id=user_id,
        company_id=company["id"],
        notes=request.notes
    )

    return {
        "message": "ウォッチリストに追加しました",
        "company_code": request.company_code,
        "company_name": company["name"]
    }


@router.delete("/{company_code}")
async def remove_from_watchlist(
    company_code: str,
    authorization: str = Header(None)
):
    """ウォッチリストから削除"""
    user_id = get_user_id_from_token(authorization)

    # 企業を取得
    company = supabase_service.get_company_by_code(company_code)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # ウォッチリストから削除
    supabase_service.remove_from_watchlist(
        user_id=user_id,
        company_id=company["id"]
    )

    return {
        "message": "ウォッチリストから削除しました",
        "company_code": company_code
    }


@router.put("/{company_code}")
async def update_watchlist_notes(
    company_code: str,
    request: WatchlistUpdateRequest,
    authorization: str = Header(None)
):
    """ウォッチリストのメモを更新"""
    user_id = get_user_id_from_token(authorization)

    # 企業を取得
    company = supabase_service.get_company_by_code(company_code)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")

    # メモを更新（upsertで実装）
    result = supabase_service.add_to_watchlist(
        user_id=user_id,
        company_id=company["id"],
        notes=request.notes
    )

    return {
        "message": "メモを更新しました",
        "company_code": company_code,
        "notes": request.notes
    }


@router.get("/check/{company_code}")
async def check_in_watchlist(
    company_code: str,
    authorization: str = Header(None)
):
    """ウォッチリストに含まれているか確認"""
    user_id = get_user_id_from_token(authorization)

    # 企業を取得
    company = supabase_service.get_company_by_code(company_code)
    if not company:
        return {"in_watchlist": False}

    # ウォッチリストを確認
    watchlist = supabase_service.get_user_watchlist(user_id)
    is_in_watchlist = any(
        item.get("companies", {}).get("code") == company_code
        for item in watchlist
    )

    return {"in_watchlist": is_in_watchlist}
