"""
株価データ取得サービス
Stooq および Yahoo Finance から株価データを取得
"""

import pandas as pd
import pandas_datareader.data as web
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class StockDataFetcher:
    """株価データ取得クラス"""

    def __init__(self):
        self.default_years = 10

    def fetch_stock_data(
        self,
        code: str,
        years: int = 10,
        source: str = "stooq"
    ) -> Optional[pd.DataFrame]:
        """
        指定した銘柄の株価データを取得

        Args:
            code: 証券コード（例: "7203" for トヨタ）
            years: 取得する年数（デフォルト: 10年）
            source: データソース（"stooq" or "yahoo"）

        Returns:
            株価データのDataFrame、取得失敗時はNone
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365)

        # 日本株の場合、Stooq用のコード形式に変換
        ticker = self._format_ticker(code, source)

        try:
            if source == "stooq":
                df = self._fetch_from_stooq(ticker, start_date, end_date)
            else:
                df = self._fetch_from_yahoo(ticker, start_date, end_date)

            if df is not None and not df.empty:
                df = self._normalize_dataframe(df)
                logger.info(f"取得成功: {code}, {len(df)}件のデータ")
                return df
            else:
                logger.warning(f"データが空です: {code}")
                return None

        except Exception as e:
            logger.error(f"株価データ取得エラー ({code}): {e}")
            # フォールバック: 別のソースを試す
            if source == "stooq":
                logger.info(f"Yahoo Finance にフォールバック: {code}")
                return self.fetch_stock_data(code, years, "yahoo")
            return None

    def _format_ticker(self, code: str, source: str) -> str:
        """
        データソースに応じたティッカーシンボル形式に変換
        """
        # 数字のみの場合は日本株と判断
        if code.isdigit():
            if source == "stooq":
                return f"{code}.JP"
            else:  # yahoo
                return f"{code}.T"
        return code

    def _fetch_from_stooq(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Stooq からデータ取得"""
        try:
            df = web.DataReader(ticker, "stooq", start_date, end_date)
            return df
        except Exception as e:
            logger.error(f"Stooq取得エラー: {e}")
            return None

    def _fetch_from_yahoo(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> Optional[pd.DataFrame]:
        """Yahoo Finance からデータ取得"""
        try:
            df = web.DataReader(ticker, "yahoo", start_date, end_date)
            return df
        except Exception as e:
            logger.error(f"Yahoo取得エラー: {e}")
            return None

    def _normalize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        DataFrameを正規化（カラム名統一、ソート）
        """
        # カラム名を小文字に統一
        df.columns = df.columns.str.lower()

        # 必要なカラムのマッピング
        column_mapping = {
            "open": "open_price",
            "high": "high_price",
            "low": "low_price",
            "close": "close_price",
            "adj close": "adjusted_close",
            "volume": "volume",
        }

        # カラム名を変換
        df = df.rename(columns=column_mapping)

        # インデックス（日付）をカラムに変換
        df = df.reset_index()
        if "Date" in df.columns:
            df = df.rename(columns={"Date": "date"})
        elif "index" in df.columns:
            df = df.rename(columns={"index": "date"})

        # 日付でソート（古い順）
        df = df.sort_values("date")

        # 必要なカラムのみ抽出
        required_columns = [
            "date", "open_price", "high_price", "low_price",
            "close_price", "volume"
        ]
        available_columns = [col for col in required_columns if col in df.columns]
        df = df[available_columns]

        # adjusted_close があれば追加
        if "adjusted_close" in df.columns:
            df["adjusted_close"] = df["adjusted_close"]

        return df

    def get_latest_price(self, code: str) -> Optional[dict]:
        """
        最新の株価を取得
        """
        df = self.fetch_stock_data(code, years=1)
        if df is not None and not df.empty:
            latest = df.iloc[-1]
            return {
                "date": latest["date"].strftime("%Y-%m-%d") if hasattr(latest["date"], "strftime") else str(latest["date"]),
                "close_price": float(latest["close_price"]),
                "volume": int(latest["volume"]) if pd.notna(latest.get("volume")) else None,
            }
        return None


# シングルトンインスタンス
stock_fetcher = StockDataFetcher()
