"""price_rules 의 테스트. 돌리는 법: cd platform/ingest && python3 -m unittest test_price_rules"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import price_rules as pr  # noqa: E402


def krx_row(code, bas_dd, close, change, **extra):
    row = {"ISU_CD": code, "BAS_DD": bas_dd, "ISU_NM": "종목",
           "TDD_CLSPRC": f"{close:,}", "CMPPREVDD_PRC": str(change),
           "TDD_OPNPRC": "0", "TDD_HGPRC": "0", "TDD_LWPRC": "0",
           "ACC_TRDVOL": "0", "ACC_TRDVAL": "0", "MKTCAP": "0", "LIST_SHRS": "0"}
    row.update(extra)
    return pr.to_price_row(row, "KOSPI")


class BasePriceTest(unittest.TestCase):

    def test_기준가는_종가에서_전일대비를_뺀_값이다(self):
        self.assertEqual(pr.base_price(10500, 500), 10000)
        self.assertEqual(pr.base_price(9500, -500), 10000)

    def test_기준가가_전일_종가와_같으면_조정_계수를_만들지_않는다(self):
        self.assertIsNone(pr.capital_factor(10000, 10500, 500))

    def test_1대5_액면분할_날은_계수_0점2_를_만든다(self):
        # 전일 50,000원, 분할 뒤 기준가 10,000원, 그날 10,300원에 마감
        self.assertAlmostEqual(pr.capital_factor(50000, 10300, 300), 0.2)

    def test_무상증자_권리락_날은_기준가를_전일_종가로_나눈_계수를_만든다(self):
        # 1주당 1주 무상증자: 전일 30,000원 → 기준가 15,000원
        self.assertAlmostEqual(pr.capital_factor(30000, 15500, 500), 0.5)

    def test_거래정지_뒤_첫_거래일은_마지막_거래일_종가와_비교한다(self):
        rows = [
            krx_row("000001", "20240102", 50000, 0),
            # 2024-01-03 ~ 01-05 거래정지로 행이 없다
            krx_row("000001", "20240108", 10000, 0),
        ]
        adj = pr.capital_adjustments(rows, {})
        self.assertEqual(len(adj), 1)
        self.assertEqual(adj[0]["ex_date"], "2024-01-08")
        self.assertAlmostEqual(adj[0]["factor"], 0.2)

    def test_구간_앞의_종가가_없는_첫_거래일은_계수를_만들지_않는다(self):
        rows = [krx_row("000002", "20240102", 7000, 7000)]
        self.assertEqual(pr.capital_adjustments(rows, {}), [])

    def test_구간_시작_전_종가를_받아_첫날의_권리락도_잡는다(self):
        rows = [krx_row("000001", "20240102", 10100, 100)]
        adj = pr.capital_adjustments(rows, {"000001": 50000})
        self.assertAlmostEqual(adj[0]["factor"], 0.2)


class AdjustedCloseTest(unittest.TestCase):

    def test_수정주가는_그_날_이후_계수들의_곱을_원시_종가에_곱한_값이다(self):
        adj = [{"ex_date": "2024-03-01", "factor": 0.2},
               {"ex_date": "2024-06-01", "factor": 0.5}]
        self.assertAlmostEqual(pr.adjusted_close(50000, "2024-01-02", adj), 5000)
        self.assertAlmostEqual(pr.adjusted_close(10000, "2024-03-01", adj), 5000)
        self.assertAlmostEqual(pr.adjusted_close(5000, "2024-06-01", adj), 5000)

    def test_계수가_없는_종목의_수정주가는_원시_종가와_같다(self):
        self.assertEqual(pr.adjusted_close(12345, "2024-01-02", []), 12345)


class ParseTest(unittest.TestCase):

    def test_KRX_숫자의_쉼표와_빈_값을_읽는다(self):
        self.assertEqual(pr.parse_int("1,234,567"), 1234567)
        self.assertIsNone(pr.parse_int("-"))
        self.assertIsNone(pr.parse_int(""))

    def test_표준코드가_오면_단축코드_6자리로_바꾼다(self):
        self.assertEqual(pr.normalize_stock_code("KR7005930003"), "005930")
        self.assertEqual(pr.normalize_stock_code("005930"), "005930")

    def test_종가가_없는_행은_버린다(self):
        row = krx_row("000001", "20240102", 1000, 0)
        self.assertIsNotNone(row)
        raw = {"ISU_CD": "000001", "BAS_DD": "20240102", "TDD_CLSPRC": "-"}
        self.assertIsNone(pr.to_price_row(raw, "KOSPI"))

    def test_지수_행은_소수_종가를_읽는다(self):
        raw = {"BAS_DD": "20240102", "CLSPRC_IDX": "2,669.81", "OPNPRC_IDX": "2,645.47"}
        row = pr.to_index_row(raw, "KOSPI")
        self.assertEqual(row["trade_date"], "2024-01-02")
        self.assertAlmostEqual(row["close"], 2669.81)


if __name__ == "__main__":
    unittest.main()
