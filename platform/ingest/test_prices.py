"""prices.py 의 쓰기 순서 테스트. DB 와 KRX 는 가짜로 바꾼다.
돌리는 법: cd platform/ingest && python3 -m unittest test_prices"""
import datetime as dt
import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prices  # noqa: E402


def price(code, day, close, change):
    return {"stock_code": code, "trade_date": day, "market": "KOSPI", "name": "종목",
            "open": close, "high": close, "low": close, "close": close, "change": change,
            "volume": 1, "trade_value": 1, "market_cap": 1, "shares_listed": 1}


class WriteChunkTest(unittest.TestCase):

    def setUp(self):
        self.calls = []
        patcher = mock.patch.object(prices.ingest, "rest",
                                    side_effect=lambda m, path, body=None, prefer=None:
                                    self.calls.append((m, path, body)))
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_시세를_마지막에_날짜_오름차순으로_써서_중간_실패_뒤에도_구멍이_남지_않는다(self):
        rows = [price("000001", "2024-01-03", 10100, 100),
                price("000001", "2024-01-02", 50000, 0),
                price("000002", "2024-01-02", 7000, 0)]
        prices.write_chunk(rows, [], {"000001": 50000})
        tables = [path.split("?")[0] for _, path, _ in self.calls]
        self.assertEqual(tables[-1], "prices_daily")
        self.assertLess(tables.index("price_adjustments"), tables.index("prices_daily"))
        written = self.calls[-1][2]
        self.assertEqual([r["trade_date"] for r in written],
                         sorted(r["trade_date"] for r in written))
        self.assertNotIn("name", written[0])

    def test_같은_날짜를_두_번_적재해도_upsert_라서_행이_늘지_않는다(self):
        rows = [price("000001", "2024-01-02", 50000, 0)]
        prices.write_chunk(rows + rows, [], {})
        _, path, body = self.calls[-1]
        self.assertIn("on_conflict=stock_code,trade_date", path)
        self.assertEqual(len(body), 1)

    def test_종목_우주는_구간의_처음과_마지막_거래일을_넘긴다(self):
        rows = [price("000001", "2024-01-02", 50000, 0), price("000001", "2024-01-05", 50000, 0)]
        prices.write_chunk(rows, [], {})
        rpc = [b for _, path, b in self.calls if path == "rpc/prices_upsert_securities"][0]
        self.assertEqual(rpc["rows"][0]["first_traded"], "2024-01-02")
        self.assertEqual(rpc["rows"][0]["last_traded"], "2024-01-05")


class FetchDayTest(unittest.TestCase):

    def test_휴장일은_빈_응답으로_받고_실패로_보지_않는다(self):
        with mock.patch.object(prices, "krx_get", return_value=[]):
            self.assertEqual(prices.fetch_day(dt.date(2024, 1, 1), ["KOSPI"]), ([], []))

    def test_지수는_벤치마크로_쓸_것만_남긴다(self):
        def fake(path, bas_dd):
            if path.startswith("idx/kospi"):
                return [{"BAS_DD": bas_dd, "IDX_NM": "코스피", "CLSPRC_IDX": "2,669.81"},
                        {"BAS_DD": bas_dd, "IDX_NM": "코스피 200 정보기술", "CLSPRC_IDX": "1"}]
            return []
        with mock.patch.object(prices, "krx_get", side_effect=fake):
            _, idx = prices.fetch_day(dt.date(2024, 1, 2), ["KOSPI"])
        self.assertEqual([r["index_code"] for r in idx], ["KOSPI"])


if __name__ == "__main__":
    unittest.main()
