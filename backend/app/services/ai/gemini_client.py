"""
Gemini AI クライアント
株式分析レポートの生成
"""

from typing import Optional
from google import genai

from app.config.settings import get_settings


class GeminiClient:
    """Gemini AI クライアント - 株式分析レポート生成"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Args:
            api_key: Gemini API キー
        """
        settings = get_settings()
        # GEMINI_API_KEYまたはGOOGLE_API_KEYを使用
        self.api_key = api_key or settings.gemini_api_key or settings.google_api_key
        self.client = genai.Client(api_key=self.api_key)
        self.model_name = "gemini-2.0-flash"

    def generate_analysis_report(
        self,
        company_name: str,
        company_code: str,
        stock_data: dict,
        financial_data: list[dict],
    ) -> dict:
        """
        AI分析レポートを生成

        Args:
            company_name: 企業名
            company_code: 証券コード
            stock_data: 株価データ（統計情報）
            financial_data: 財務データ（複数年度）

        Returns:
            分析レポート
        """
        # プロンプトを構築
        prompt = self._build_analysis_prompt(
            company_name,
            company_code,
            stock_data,
            financial_data
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            report_text = response.text

            # レポートをセクションに分割
            sections = self._parse_report_sections(report_text)

            return {
                "summary": sections.get("summary", ""),
                "business_analysis": sections.get("business_analysis", ""),
                "financial_analysis": sections.get("financial_analysis", ""),
                "stock_analysis": sections.get("stock_analysis", ""),
                "risk_factors": sections.get("risk_factors", ""),
                "outlook": sections.get("outlook", ""),
                "full_report": report_text,
            }

        except Exception as e:
            print(f"Gemini API error: {e}")
            return {
                "summary": f"レポート生成中にエラーが発生しました: {str(e)}",
                "business_analysis": "",
                "financial_analysis": "",
                "stock_analysis": "",
                "risk_factors": "",
                "outlook": "",
                "full_report": "",
            }

    def _build_analysis_prompt(
        self,
        company_name: str,
        company_code: str,
        stock_data: dict,
        financial_data: list[dict],
    ) -> str:
        """分析プロンプトを構築"""

        # 財務データのサマリー
        financial_summary = self._format_financial_data(financial_data)

        # 株価データのサマリー
        stock_summary = self._format_stock_data(stock_data)

        prompt = f"""あなたは日本株式市場の専門アナリストです。以下の企業について、投資分析レポートを作成してください。

## 対象企業
- 企業名: {company_name}
- 証券コード: {company_code}

## 株価データ
{stock_summary}

## 財務データ（過去10年分）
{financial_summary}

## 分析レポートの構成

以下の形式でレポートを作成してください。各セクションは「##」で始めてください。

## サマリー
企業の概要と投資判断の要点を3-5文で簡潔にまとめてください。

## 事業分析
- 主要事業の内容と市場ポジション
- 競合他社との比較における強み・弱み
- 事業環境の変化と対応

## 財務分析
- 売上高・利益の推移とトレンド
- 財務健全性（自己資本比率、負債比率など）
- キャッシュフローの状況
- ROE、ROAなどの収益性指標

## 株価分析
- 現在の株価水準の評価
- PER、PBRなどのバリュエーション
- 過去の株価推移の特徴

## リスク要因
- 事業リスク
- 財務リスク
- 外部環境リスク

## 今後の見通し
- 短期的な見通し（1年以内）
- 中長期的な見通し（3-5年）
- 注目すべきカタリスト

---
【重要な注意事項】
- このレポートは情報提供のみを目的としており、投資助言ではありません
- 投資判断は必ずご自身の責任で行ってください
- 将来の株価や業績を保証するものではありません
"""
        return prompt

    def _format_financial_data(self, financial_data: list[dict]) -> str:
        """財務データをテキスト形式に整形"""
        if not financial_data:
            return "財務データがありません"

        lines = []
        sorted_data = sorted(financial_data, key=lambda x: x.get("fiscal_year", 0))

        for data in sorted_data:
            year = data.get("fiscal_year", "N/A")
            revenue = data.get("revenue")
            op_income = data.get("operating_income")
            net_income = data.get("net_income")
            total_assets = data.get("total_assets")
            equity = data.get("shareholders_equity")

            line = f"- {year}年度: "
            parts = []
            if revenue:
                parts.append(f"売上高 {revenue/100000000:.1f}億円")
            if op_income:
                parts.append(f"営業利益 {op_income/100000000:.1f}億円")
            if net_income:
                parts.append(f"純利益 {net_income/100000000:.1f}億円")
            if total_assets:
                parts.append(f"総資産 {total_assets/100000000:.1f}億円")

            # ROEを計算
            if net_income and equity and equity > 0:
                roe = net_income / equity * 100
                parts.append(f"ROE {roe:.1f}%")

            if parts:
                line += ", ".join(parts)
                lines.append(line)

        # 成長率の計算
        if len(sorted_data) >= 2:
            latest = sorted_data[-1]
            oldest = sorted_data[0]
            if latest.get("revenue") and oldest.get("revenue") and oldest["revenue"] > 0:
                cagr = ((latest["revenue"] / oldest["revenue"]) ** (1 / len(sorted_data)) - 1) * 100
                lines.append(f"\n【{len(sorted_data)}年間の成長トレンド】")
                lines.append(f"- 売上高CAGR（年平均成長率）: {cagr:.1f}%")

            if latest.get("net_income") and oldest.get("net_income") and oldest["net_income"] > 0:
                profit_cagr = ((latest["net_income"] / oldest["net_income"]) ** (1 / len(sorted_data)) - 1) * 100
                lines.append(f"- 純利益CAGR（年平均成長率）: {profit_cagr:.1f}%")

        return "\n".join(lines) if lines else "財務データがありません"

    def _format_stock_data(self, stock_data: dict) -> str:
        """株価データをテキスト形式に整形"""
        if not stock_data:
            return "株価データがありません"

        lines = []
        if "latest_price" in stock_data:
            lines.append(f"- 最新株価: ¥{stock_data['latest_price']:,.0f}")
        if "price_change_1y" in stock_data:
            lines.append(f"- 1年間騰落率: {stock_data['price_change_1y']:.1f}%")
        if "high_52w" in stock_data:
            lines.append(f"- 52週高値: ¥{stock_data['high_52w']:,.0f}")
        if "low_52w" in stock_data:
            lines.append(f"- 52週安値: ¥{stock_data['low_52w']:,.0f}")
        if "avg_volume" in stock_data:
            lines.append(f"- 平均出来高: {stock_data['avg_volume']:,.0f}株")

        return "\n".join(lines) if lines else "株価データがありません"

    def _parse_report_sections(self, report_text: str) -> dict:
        """レポートテキストをセクションに分割"""
        sections = {}
        current_section = None
        current_content = []

        section_mapping = {
            "サマリー": "summary",
            "事業分析": "business_analysis",
            "財務分析": "financial_analysis",
            "株価分析": "stock_analysis",
            "リスク要因": "risk_factors",
            "今後の見通し": "outlook",
        }

        for line in report_text.split("\n"):
            # セクション見出しを検出
            if line.startswith("## "):
                # 前のセクションを保存
                if current_section:
                    sections[current_section] = "\n".join(current_content).strip()

                # 新しいセクションを開始
                section_title = line[3:].strip()
                current_section = section_mapping.get(section_title)
                current_content = []
            elif current_section:
                current_content.append(line)

        # 最後のセクションを保存
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        return sections


# シングルトンインスタンス
gemini_client = GeminiClient()
