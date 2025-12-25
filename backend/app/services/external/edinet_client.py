"""
EDINET API クライアント
有価証券報告書などの開示書類を取得
"""

import requests
import zipfile
import io
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Optional
import logging
import re

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class EdinetClient:
    """EDINET API v2 クライアント"""

    BASE_URL = "https://disclosure.edinet-fsa.go.jp/api/v2"

    # 有価証券報告書のコード
    ORDINANCE_CODE_YUHO = "010"  # 企業内容等の開示に関する内閣府令
    FORM_CODE_YUHO = "030000"    # 有価証券報告書

    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or settings.edinet_api_key
        if not self.api_key:
            logger.warning("EDINET API key not configured")

    def _make_request(self, endpoint: str, params: dict = None) -> requests.Response:
        """API リクエストを実行"""
        url = f"{self.BASE_URL}/{endpoint}"
        if params is None:
            params = {}
        params["Subscription-Key"] = self.api_key

        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response

    def get_documents_list(self, date: str, doc_type: int = 2) -> dict:
        """
        指定日の書類一覧を取得

        Args:
            date: 日付 (YYYY-MM-DD形式)
            doc_type: 1=メタデータのみ, 2=提出書類一覧及びメタデータ

        Returns:
            APIレスポンス (JSON)
        """
        params = {
            "date": date,
            "type": doc_type
        }
        response = self._make_request("documents.json", params)
        return response.json()

    def find_yuho_by_edinet_code(
        self,
        edinet_code: str,
        start_date: Optional[str] = None,
        years: int = 10
    ) -> list[dict]:
        """
        EDINETコードで有価証券報告書を検索

        Args:
            edinet_code: EDINETコード
            start_date: 検索開始日 (省略時は今日)
            years: 遡る年数

        Returns:
            有価証券報告書のリスト
        """
        if not start_date:
            start_date = datetime.now().strftime("%Y-%m-%d")

        end_date = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=365 * years))
        current_date = datetime.strptime(start_date, "%Y-%m-%d")

        yuho_list = []

        while current_date >= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            try:
                result = self.get_documents_list(date_str)
                documents = result.get("results", [])

                for doc in documents:
                    if (doc.get("edinetCode") == edinet_code and
                        doc.get("ordinanceCode") == self.ORDINANCE_CODE_YUHO and
                        doc.get("formCode") == self.FORM_CODE_YUHO):
                        yuho_list.append({
                            "doc_id": doc.get("docID"),
                            "edinet_code": doc.get("edinetCode"),
                            "company_name": doc.get("filerName"),
                            "doc_description": doc.get("docDescription"),
                            "submit_date": doc.get("submitDateTime"),
                            "period_start": doc.get("periodStart"),
                            "period_end": doc.get("periodEnd"),
                        })

            except Exception as e:
                logger.warning(f"Error fetching documents for {date_str}: {e}")

            # 1日ずつ遡る（効率化のため7日単位でスキップ可能）
            current_date -= timedelta(days=7)

        return yuho_list

    def download_document(self, doc_id: str, doc_type: int = 1) -> bytes:
        """
        書類をダウンロード

        Args:
            doc_id: 書類管理番号
            doc_type: 1=XBRL, 2=PDF, 3=代替書面, 4=英文

        Returns:
            ダウンロードしたファイルのバイトデータ
        """
        params = {"type": doc_type}
        response = self._make_request(f"documents/{doc_id}", params)
        return response.content

    def extract_financial_data_from_xbrl(self, doc_id: str) -> dict:
        """
        XBRLから財務データを抽出

        Args:
            doc_id: 書類管理番号

        Returns:
            抽出した財務データ
        """
        try:
            # XBRLファイル（ZIP）をダウンロード
            zip_data = self.download_document(doc_id, doc_type=1)

            # ZIPを解凍
            with zipfile.ZipFile(io.BytesIO(zip_data)) as zf:
                # XBRLファイルを探す
                xbrl_files = [f for f in zf.namelist() if f.endswith('.xbrl') and 'PublicDoc' in f]

                if not xbrl_files:
                    logger.warning(f"No XBRL file found in {doc_id}")
                    return {}

                # 最初のXBRLファイルを解析
                xbrl_content = zf.read(xbrl_files[0])
                return self._parse_xbrl(xbrl_content)

        except Exception as e:
            logger.error(f"Error extracting financial data from {doc_id}: {e}")
            return {}

    def _parse_xbrl(self, xbrl_content: bytes) -> dict:
        """XBRLコンテンツを解析して財務データを抽出"""
        try:
            root = ET.fromstring(xbrl_content)

            # 名前空間の定義
            namespaces = {
                'jppfs_cor': 'http://disclosure.edinet-fsa.go.jp/taxonomy/jppfs/2023-12-01/jppfs_cor',
                'jpcrp_cor': 'http://disclosure.edinet-fsa.go.jp/taxonomy/jpcrp/2023-12-01/jpcrp_cor',
            }

            financial_data = {}

            # 売上高
            revenue = self._find_element_value(root, [
                './/jppfs_cor:NetSales',
                './/jppfs_cor:Revenue',
                './/jppfs_cor:OperatingRevenue',
            ], namespaces)
            if revenue:
                financial_data['revenue'] = int(float(revenue))

            # 営業利益
            op_income = self._find_element_value(root, [
                './/jppfs_cor:OperatingIncome',
                './/jppfs_cor:OperatingProfit',
            ], namespaces)
            if op_income:
                financial_data['operating_income'] = int(float(op_income))

            # 純利益
            net_income = self._find_element_value(root, [
                './/jppfs_cor:ProfitLossAttributableToOwnersOfParent',
                './/jppfs_cor:NetIncome',
                './/jppfs_cor:ProfitLoss',
            ], namespaces)
            if net_income:
                financial_data['net_income'] = int(float(net_income))

            # 総資産
            total_assets = self._find_element_value(root, [
                './/jppfs_cor:TotalAssets',
                './/jppfs_cor:Assets',
            ], namespaces)
            if total_assets:
                financial_data['total_assets'] = int(float(total_assets))

            # 純資産（株主資本）
            equity = self._find_element_value(root, [
                './/jppfs_cor:EquityAttributableToOwnersOfParent',
                './/jppfs_cor:ShareholdersEquity',
                './/jppfs_cor:NetAssets',
            ], namespaces)
            if equity:
                financial_data['shareholders_equity'] = int(float(equity))

            return financial_data

        except Exception as e:
            logger.error(f"Error parsing XBRL: {e}")
            return {}

    def _find_element_value(self, root, xpaths: list, namespaces: dict) -> Optional[str]:
        """複数のXPathを試して値を取得"""
        for xpath in xpaths:
            try:
                # 名前空間付きで検索
                for prefix, uri in namespaces.items():
                    adjusted_xpath = xpath.replace(f'{prefix}:', f'{{{uri}}}')
                    elements = root.findall(adjusted_xpath)
                    for elem in elements:
                        # contextRefが当期のものを優先
                        context_ref = elem.get('contextRef', '')
                        if 'Current' in context_ref or 'instant' in context_ref.lower():
                            if elem.text and elem.text.strip():
                                return elem.text.strip()
            except Exception:
                continue
        return None

    def get_financial_summary(
        self,
        edinet_code: str,
        years: int = 10
    ) -> list[dict]:
        """
        指定企業の財務サマリーを取得

        Args:
            edinet_code: EDINETコード
            years: 取得年数

        Returns:
            年度ごとの財務データリスト
        """
        # 有価証券報告書を検索
        yuho_list = self.find_yuho_by_edinet_code(edinet_code, years=years)

        financial_summaries = []
        for yuho in yuho_list:
            doc_id = yuho.get("doc_id")
            if doc_id:
                # XBRLから財務データを抽出
                financial_data = self.extract_financial_data_from_xbrl(doc_id)
                if financial_data:
                    # 会計期間から年度を取得
                    period_end = yuho.get("period_end", "")
                    if period_end:
                        fiscal_year = int(period_end[:4])
                        financial_data["fiscal_year"] = fiscal_year
                        financial_data["fiscal_period"] = "FY"
                        financial_data["doc_id"] = doc_id
                        financial_summaries.append(financial_data)

        return sorted(financial_summaries, key=lambda x: x.get("fiscal_year", 0), reverse=True)


# シングルトンインスタンス
edinet_client = EdinetClient()
