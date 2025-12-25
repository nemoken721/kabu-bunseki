"""
デモ用財務データをDBに登録するスクリプト
実際のデータはEDINET APIから取得しますが、デモ用にサンプルデータを追加します
"""

import sys
import os

# プロジェクトルートをパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database.supabase_client import supabase_service


# トヨタ自動車のサンプル財務データ（10年分）
# DBスキーマに存在するカラムのみを使用
TOYOTA_FINANCIAL_DATA = [
    {
        "fiscal_year": 2024,
        "fiscal_period": "FY",
        "revenue": 45095325000000,  # 約45兆円
        "operating_income": 5352934000000,  # 約5.3兆円
        "net_income": 4944898000000,  # 約4.9兆円
        "total_assets": 90114866000000,  # 約90兆円
        "shareholders_equity": 32907163000000,
    },
    {
        "fiscal_year": 2023,
        "fiscal_period": "FY",
        "revenue": 37154298000000,
        "operating_income": 2725025000000,
        "net_income": 2451318000000,
        "total_assets": 74303180000000,
        "shareholders_equity": 26245969000000,
    },
    {
        "fiscal_year": 2022,
        "fiscal_period": "FY",
        "revenue": 31379507000000,
        "operating_income": 2995697000000,
        "net_income": 2850110000000,
        "total_assets": 67688771000000,
        "shareholders_equity": 24288329000000,
    },
    {
        "fiscal_year": 2021,
        "fiscal_period": "FY",
        "revenue": 27214594000000,
        "operating_income": 2197748000000,
        "net_income": 2245261000000,
        "total_assets": 62267140000000,
        "shareholders_equity": 21920618000000,
    },
    {
        "fiscal_year": 2020,
        "fiscal_period": "FY",
        "revenue": 29929992000000,
        "operating_income": 2442869000000,
        "net_income": 2076183000000,
        "total_assets": 52680436000000,
        "shareholders_equity": 20618884000000,
    },
    {
        "fiscal_year": 2019,
        "fiscal_period": "FY",
        "revenue": 30225681000000,
        "operating_income": 2467545000000,
        "net_income": 1882873000000,
        "total_assets": 51936949000000,
        "shareholders_equity": 19795833000000,
    },
    {
        "fiscal_year": 2018,
        "fiscal_period": "FY",
        "revenue": 29379510000000,
        "operating_income": 2399805000000,
        "net_income": 2493983000000,
        "total_assets": 50308249000000,
        "shareholders_equity": 18965596000000,
    },
    {
        "fiscal_year": 2017,
        "fiscal_period": "FY",
        "revenue": 27597193000000,
        "operating_income": 1994374000000,
        "net_income": 1831109000000,
        "total_assets": 48750186000000,
        "shareholders_equity": 17513888000000,
    },
    {
        "fiscal_year": 2016,
        "fiscal_period": "FY",
        "revenue": 28403118000000,
        "operating_income": 2853971000000,
        "net_income": 2312694000000,
        "total_assets": 47729830000000,
        "shareholders_equity": 16746798000000,
    },
    {
        "fiscal_year": 2015,
        "fiscal_period": "FY",
        "revenue": 27234521000000,
        "operating_income": 2750564000000,
        "net_income": 2173338000000,
        "total_assets": 47729830000000,
        "shareholders_equity": 15630952000000,
    },
]


def seed_financial_data():
    """財務データをDBに登録"""
    # トヨタの企業情報を取得
    company = supabase_service.get_company_by_code("7203")
    if not company:
        print("トヨタ自動車が見つかりません。先にseed_companies.pyを実行してください。")
        return

    company_id = company["id"]
    print(f"Company ID: {company_id}")
    print(f"企業名: {company['name']}")

    # 財務データを登録
    for data in TOYOTA_FINANCIAL_DATA:
        data["company_id"] = company_id
        try:
            result = supabase_service.upsert_financial_statement(data)
            print(f"  - {data['fiscal_year']}年度のデータを登録しました")
        except Exception as e:
            print(f"  - {data['fiscal_year']}年度のデータ登録失敗: {e}")

    print("\n完了！")


if __name__ == "__main__":
    seed_financial_data()
