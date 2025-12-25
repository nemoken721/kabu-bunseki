"""
EDINET API クライアント
金融庁の EDINET から有価証券報告書等の開示書類を取得
https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WZEK0110.html
"""

import os
import requests
import zipfile
import io
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass


@dataclass
class DocumentInfo:
    """書類情報"""
    doc_id: str
    edinet_code: str
    sec_code: str  # 証券コード（銘柄コード）
    filer_name: str  # 提出者名
    doc_type_code: str  # 書類種別コード
    doc_description: str  # 書類概要
    submit_date: str  # 提出日
    period_start: Optional[str]  # 期間開始日
    period_end: Optional[str]  # 期間終了日


class EdinetClient:
    """EDINET API クライアント"""

    BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"

    # 書類種別コード
    DOC_TYPE_ANNUAL_REPORT = "120"  # 有価証券報告書
    DOC_TYPE_QUARTERLY_REPORT = "140"  # 四半期報告書
    DOC_TYPE_SEMI_ANNUAL = "130"  # 半期報告書

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: EDINET API キー（v2では必須）
        """
        self.api_key = api_key or os.getenv("EDINET_API_KEY", "")
        self.session = requests.Session()

    def get_document_list(
        self,
        date: str,
        doc_type: str = "2"  # 2=有価証券報告書等
    ) -> list[DocumentInfo]:
        """
        指定日の書類一覧を取得

        Args:
            date: 日付（YYYY-MM-DD形式）
            doc_type: 書類種別（1=メタデータのみ, 2=書類一覧）

        Returns:
            書類情報のリスト
        """
        url = f"{self.BASE_URL}/documents.json"
        params = {
            "date": date,
            "type": doc_type,
        }
        if self.api_key:
            params["Subscription-Key"] = self.api_key

        response = self.session.get(url, params=params)
        response.raise_for_status()

        data = response.json()

        if data.get("metadata", {}).get("status") != "200":
            raise Exception(f"EDINET API Error: {data}")

        documents = []
        for result in data.get("results", []):
            # 証券コードがあるもののみ
            sec_code = result.get("secCode")
            if not sec_code:
                continue

            documents.append(DocumentInfo(
                doc_id=result.get("docID", ""),
                edinet_code=result.get("edinetCode", ""),
                sec_code=sec_code[:4] if sec_code else "",  # 4桁に正規化
                filer_name=result.get("filerName", ""),
                doc_type_code=result.get("docTypeCode", ""),
                doc_description=result.get("docDescription", ""),
                submit_date=result.get("submitDateTime", "")[:10] if result.get("submitDateTime") else "",
                period_start=result.get("periodStart"),
                period_end=result.get("periodEnd"),
            ))

        return documents

    def get_annual_reports(
        self,
        sec_code: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> list[DocumentInfo]:
        """
        指定銘柄の有価証券報告書を検索

        Args:
            sec_code: 証券コード（4桁）
            start_date: 検索開始日
            end_date: 検索終了日

        Returns:
            有価証券報告書のリスト
        """
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            # デフォルトで過去10年
            start_date = (datetime.now() - timedelta(days=365*10)).strftime("%Y-%m-%d")

        # 日付範囲で検索（日毎にAPIを叩く必要がある）
        # 効率化のため、年度末付近の日付のみチェック
        reports = []
        current = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        # 3月決算が多いので、6月（提出期限）を中心にチェック
        check_months = [6, 7, 8]  # 有報提出が多い月

        while current <= end:
            if current.month in check_months:
                try:
                    docs = self.get_document_list(current.strftime("%Y-%m-%d"))
                    for doc in docs:
                        if (doc.sec_code == sec_code[:4] and
                            doc.doc_type_code == self.DOC_TYPE_ANNUAL_REPORT):
                            reports.append(doc)
                except Exception as e:
                    print(f"Error fetching documents for {current}: {e}")

            current += timedelta(days=1)

        return reports

    def download_document(
        self,
        doc_id: str,
        response_type: int = 1  # 1=zip, 2=PDF
    ) -> bytes:
        """
        書類をダウンロード

        Args:
            doc_id: 書類ID
            response_type: 1=XBRLを含むZIP, 2=PDF

        Returns:
            ダウンロードしたバイトデータ
        """
        url = f"{self.BASE_URL}/documents/{doc_id}"
        params = {"type": response_type}
        if self.api_key:
            params["Subscription-Key"] = self.api_key

        response = self.session.get(url, params=params)
        response.raise_for_status()

        return response.content

    def extract_xbrl_from_zip(self, zip_data: bytes) -> dict[str, bytes]:
        """
        ZIPファイルからXBRLファイルを抽出

        Args:
            zip_data: ZIPファイルのバイトデータ

        Returns:
            ファイル名とコンテンツのマッピング
        """
        xbrl_files = {}

        with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
            for name in zf.namelist():
                if name.endswith('.xbrl') or name.endswith('.xml'):
                    xbrl_files[name] = zf.read(name)

        return xbrl_files


# シングルトンインスタンス
edinet_client = EdinetClient()
