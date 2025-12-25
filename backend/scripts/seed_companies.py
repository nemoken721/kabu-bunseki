"""
企業マスタデータの初期投入スクリプト
主要な日本企業のデータを Supabase に登録
"""

import sys
import os

# パスを追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database.supabase_client import supabase_service

# 主要企業のサンプルデータ（日経225の一部）
# EDINETコードはEDINET企業検索で取得
SAMPLE_COMPANIES = [
    {"code": "7203", "name": "トヨタ自動車", "name_en": "Toyota Motor Corporation", "sector": "輸送用機器", "market": "プライム", "edinet_code": "E02144"},
    {"code": "6758", "name": "ソニーグループ", "name_en": "Sony Group Corporation", "sector": "電気機器", "market": "プライム", "edinet_code": "E01777"},
    {"code": "9984", "name": "ソフトバンクグループ", "name_en": "SoftBank Group Corp.", "sector": "情報・通信業", "market": "プライム", "edinet_code": "E02778"},
    {"code": "6861", "name": "キーエンス", "name_en": "KEYENCE CORPORATION", "sector": "電気機器", "market": "プライム", "edinet_code": "E02356"},
    {"code": "8306", "name": "三菱UFJフィナンシャル・グループ", "name_en": "Mitsubishi UFJ Financial Group", "sector": "銀行業", "market": "プライム", "edinet_code": "E03606"},
    {"code": "9432", "name": "日本電信電話", "name_en": "Nippon Telegraph and Telephone Corporation", "sector": "情報・通信業", "market": "プライム", "edinet_code": "E04430"},
    {"code": "6501", "name": "日立製作所", "name_en": "Hitachi, Ltd.", "sector": "電気機器", "market": "プライム", "edinet_code": "E01737"},
    {"code": "7267", "name": "本田技研工業", "name_en": "Honda Motor Co., Ltd.", "sector": "輸送用機器", "market": "プライム", "edinet_code": "E02166"},
    {"code": "4063", "name": "信越化学工業", "name_en": "Shin-Etsu Chemical Co., Ltd.", "sector": "化学", "market": "プライム", "edinet_code": "E00790"},
    {"code": "8035", "name": "東京エレクトロン", "name_en": "Tokyo Electron Limited", "sector": "電気機器", "market": "プライム", "edinet_code": "E02089"},
    {"code": "6902", "name": "デンソー", "name_en": "DENSO CORPORATION", "sector": "輸送用機器", "market": "プライム", "edinet_code": "E01840"},
    {"code": "9433", "name": "KDDI", "name_en": "KDDI Corporation", "sector": "情報・通信業", "market": "プライム", "edinet_code": "E04425"},
    {"code": "7741", "name": "HOYA", "name_en": "HOYA CORPORATION", "sector": "精密機器", "market": "プライム", "edinet_code": "E02096"},
    {"code": "4519", "name": "中外製薬", "name_en": "Chugai Pharmaceutical Co., Ltd.", "sector": "医薬品", "market": "プライム", "edinet_code": "E00939"},
    {"code": "6098", "name": "リクルートホールディングス", "name_en": "Recruit Holdings Co., Ltd.", "sector": "サービス業", "market": "プライム", "edinet_code": "E05765"},
    {"code": "6981", "name": "村田製作所", "name_en": "Murata Manufacturing Co., Ltd.", "sector": "電気機器", "market": "プライム", "edinet_code": "E01862"},
    {"code": "7974", "name": "任天堂", "name_en": "Nintendo Co., Ltd.", "sector": "その他製品", "market": "プライム", "edinet_code": "E02124"},
    {"code": "4502", "name": "武田薬品工業", "name_en": "Takeda Pharmaceutical Company Limited", "sector": "医薬品", "market": "プライム", "edinet_code": "E00919"},
    {"code": "8058", "name": "三菱商事", "name_en": "Mitsubishi Corporation", "sector": "卸売業", "market": "プライム", "edinet_code": "E02529"},
    {"code": "8031", "name": "三井物産", "name_en": "Mitsui & Co., Ltd.", "sector": "卸売業", "market": "プライム", "edinet_code": "E02513"},
    {"code": "9983", "name": "ファーストリテイリング", "name_en": "Fast Retailing Co., Ltd.", "sector": "小売業", "market": "プライム", "edinet_code": "E03161"},
    {"code": "6367", "name": "ダイキン工業", "name_en": "DAIKIN INDUSTRIES, LTD.", "sector": "機械", "market": "プライム", "edinet_code": "E01576"},
    {"code": "6954", "name": "ファナック", "name_en": "FANUC CORPORATION", "sector": "電気機器", "market": "プライム", "edinet_code": "E01821"},
    {"code": "4661", "name": "オリエンタルランド", "name_en": "Oriental Land Co., Ltd.", "sector": "サービス業", "market": "プライム", "edinet_code": "E04812"},
    {"code": "6594", "name": "日本電産", "name_en": "Nidec Corporation", "sector": "電気機器", "market": "プライム", "edinet_code": "E01769"},
    {"code": "8766", "name": "東京海上ホールディングス", "name_en": "Tokio Marine Holdings, Inc.", "sector": "保険業", "market": "プライム", "edinet_code": "E03782"},
    {"code": "4568", "name": "第一三共", "name_en": "Daiichi Sankyo Company, Limited", "sector": "医薬品", "market": "プライム", "edinet_code": "E00734"},
    {"code": "6762", "name": "TDK", "name_en": "TDK Corporation", "sector": "電気機器", "market": "プライム", "edinet_code": "E01782"},
    {"code": "6857", "name": "アドバンテスト", "name_en": "Advantest Corporation", "sector": "電気機器", "market": "プライム", "edinet_code": "E01970"},
    {"code": "7751", "name": "キヤノン", "name_en": "Canon Inc.", "sector": "電気機器", "market": "プライム", "edinet_code": "E02274"},
]


def seed_companies():
    """企業データを投入"""
    print("企業マスタデータの投入を開始...")

    success_count = 0
    error_count = 0

    for company in SAMPLE_COMPANIES:
        try:
            result = supabase_service.upsert_company(company)
            if result:
                print(f"[OK] {company['code']} {company['name']}")
                success_count += 1
            else:
                print(f"[NG] {company['code']} {company['name']} - 結果なし")
                error_count += 1
        except Exception as e:
            print(f"[NG] {company['code']} {company['name']} - エラー: {e}")
            error_count += 1

    print(f"\n完了: 成功 {success_count} 件, 失敗 {error_count} 件")
    return success_count, error_count


if __name__ == "__main__":
    seed_companies()
