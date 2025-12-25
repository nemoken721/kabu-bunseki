"""
XBRL パーサー
有価証券報告書から財務データを抽出
"""

from lxml import etree
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class FinancialData:
    """財務データ"""
    fiscal_year: int
    fiscal_period: str  # "FY" (通期), "Q1", "Q2", "Q3", "Q4"
    accounting_standard: str  # "JGAAP", "IFRS", "USGAAP"

    # 損益計算書
    revenue: Optional[int] = None  # 売上高
    operating_income: Optional[int] = None  # 営業利益
    ordinary_income: Optional[int] = None  # 経常利益（日本基準のみ）
    net_income: Optional[int] = None  # 当期純利益

    # 貸借対照表
    total_assets: Optional[int] = None  # 総資産
    total_liabilities: Optional[int] = None  # 負債合計
    shareholders_equity: Optional[int] = None  # 株主資本
    net_assets: Optional[int] = None  # 純資産

    # キャッシュフロー計算書
    operating_cf: Optional[int] = None  # 営業CF
    investing_cf: Optional[int] = None  # 投資CF
    financing_cf: Optional[int] = None  # 財務CF

    # 1株指標
    eps: Optional[float] = None  # EPS（1株当たり利益）
    bps: Optional[float] = None  # BPS（1株当たり純資産）
    dps: Optional[float] = None  # DPS（1株当たり配当）

    # 財務指標
    roe: Optional[float] = None  # ROE
    roa: Optional[float] = None  # ROA

    # 経営者による説明
    mda_summary: Optional[str] = None


class XBRLParser:
    """XBRLパーサー"""

    # 主要な名前空間
    NAMESPACES = {
        'xbrli': 'http://www.xbrl.org/2003/instance',
        'jp-t-cte': 'http://disclosure.edinet-fsa.go.jp/taxonomy/jppfs/2023-11-01/jppfs_cor',
        'jppfs_cor': 'http://disclosure.edinet-fsa.go.jp/taxonomy/jppfs/2023-11-01/jppfs_cor',
        'jpcrp_cor': 'http://disclosure.edinet-fsa.go.jp/taxonomy/jpcrp/2023-11-01/jpcrp_cor',
    }

    # 財務項目のマッピング（日本基準）
    JGAAP_MAPPINGS = {
        # 売上高
        'revenue': [
            'NetSales',
            'Revenue',
            'OperatingRevenue',
            'NetSalesSummaryOfBusinessResults',
        ],
        # 営業利益
        'operating_income': [
            'OperatingIncome',
            'OperatingProfit',
            'OperatingIncomeSummaryOfBusinessResults',
        ],
        # 経常利益
        'ordinary_income': [
            'OrdinaryIncome',
            'OrdinaryProfit',
            'OrdinaryIncomeSummaryOfBusinessResults',
        ],
        # 当期純利益
        'net_income': [
            'NetIncome',
            'ProfitAttributableToOwnersOfParent',
            'NetIncomeSummaryOfBusinessResults',
            'ProfitLossAttributableToOwnersOfParent',
        ],
        # 総資産
        'total_assets': [
            'TotalAssets',
            'Assets',
            'TotalAssetsSummaryOfBusinessResults',
        ],
        # 純資産
        'net_assets': [
            'NetAssets',
            'TotalEquity',
            'NetAssetsSummaryOfBusinessResults',
        ],
        # 株主資本
        'shareholders_equity': [
            'ShareholdersEquity',
            'EquityAttributableToOwnersOfParent',
        ],
        # EPS
        'eps': [
            'BasicEarningsPerShare',
            'BasicEarningsLossPerShare',
            'EarningsPerShare',
        ],
        # BPS
        'bps': [
            'NetAssetsPerShare',
            'BookValuePerShare',
        ],
        # ROE
        'roe': [
            'RateOfReturnOnEquity',
            'ReturnOnEquity',
        ],
        # キャッシュフロー
        'operating_cf': [
            'NetCashProvidedByUsedInOperatingActivities',
            'CashFlowsFromOperatingActivities',
        ],
        'investing_cf': [
            'NetCashProvidedByUsedInInvestingActivities',
            'CashFlowsFromInvestingActivities',
        ],
        'financing_cf': [
            'NetCashProvidedByUsedInFinancingActivities',
            'CashFlowsFromFinancingActivities',
        ],
    }

    def __init__(self):
        pass

    def parse(self, xbrl_content: bytes) -> Optional[FinancialData]:
        """
        XBRLコンテンツをパース

        Args:
            xbrl_content: XBRLファイルのバイトデータ

        Returns:
            財務データ（パース失敗時はNone）
        """
        try:
            root = etree.fromstring(xbrl_content)
        except Exception as e:
            print(f"XML parse error: {e}")
            return None

        # 会計基準を判定
        accounting_standard = self._detect_accounting_standard(root)

        # 決算期を判定
        fiscal_year, fiscal_period = self._detect_fiscal_period(root)

        if not fiscal_year:
            return None

        # 財務データを抽出
        data = FinancialData(
            fiscal_year=fiscal_year,
            fiscal_period=fiscal_period,
            accounting_standard=accounting_standard,
        )

        # 各財務項目を抽出
        for field_name, element_names in self.JGAAP_MAPPINGS.items():
            value = self._extract_value(root, element_names)
            if value is not None:
                setattr(data, field_name, value)

        # ROAを計算（データがあれば）
        if data.net_income and data.total_assets:
            data.roa = round(data.net_income / data.total_assets * 100, 2)

        # ROEを計算（データがあれば）
        if data.net_income and data.shareholders_equity:
            data.roe = round(data.net_income / data.shareholders_equity * 100, 2)

        return data

    def _detect_accounting_standard(self, root: etree._Element) -> str:
        """会計基準を判定"""
        root_str = etree.tostring(root, encoding='unicode')

        if 'ifrs' in root_str.lower():
            return "IFRS"
        elif 'usgaap' in root_str.lower():
            return "USGAAP"
        else:
            return "JGAAP"

    def _detect_fiscal_period(self, root: etree._Element) -> tuple[Optional[int], str]:
        """決算期を判定"""
        # コンテキストから期末日を取得
        for context in root.iter('{http://www.xbrl.org/2003/instance}context'):
            period = context.find('.//{http://www.xbrl.org/2003/instance}instant')
            if period is not None and period.text:
                try:
                    # YYYY-MM-DD形式を想定
                    year = int(period.text[:4])
                    return year, "FY"
                except:
                    pass

            # 期間の場合
            end_date = context.find('.//{http://www.xbrl.org/2003/instance}endDate')
            if end_date is not None and end_date.text:
                try:
                    year = int(end_date.text[:4])
                    return year, "FY"
                except:
                    pass

        return None, "FY"

    def _extract_value(
        self,
        root: etree._Element,
        element_names: list[str]
    ) -> Optional[int | float]:
        """
        指定された要素名から値を抽出

        Args:
            root: XMLルート要素
            element_names: 検索する要素名のリスト

        Returns:
            抽出した値（見つからない場合はNone）
        """
        for element_name in element_names:
            # 様々な名前空間で検索
            for ns_prefix, ns_uri in self.NAMESPACES.items():
                elements = root.findall(f'.//{{{ns_uri}}}{element_name}')
                if elements:
                    for elem in elements:
                        if elem.text:
                            try:
                                # 数値に変換
                                value = float(elem.text.replace(',', ''))
                                # 整数で表現できる場合は整数に
                                if value == int(value):
                                    return int(value)
                                return value
                            except ValueError:
                                continue

            # 名前空間なしでも検索
            for elem in root.iter():
                local_name = etree.QName(elem.tag).localname
                if local_name == element_name and elem.text:
                    try:
                        value = float(elem.text.replace(',', ''))
                        if value == int(value):
                            return int(value)
                        return value
                    except ValueError:
                        continue

        return None


# シングルトンインスタンス
xbrl_parser = XBRLParser()
