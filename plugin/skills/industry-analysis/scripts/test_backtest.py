#!/usr/bin/env python3
"""backtest.py 의 계약. 표준 라이브러리 unittest 로 돈다.

    python3 -m unittest plugin/skills/industry-analysis/scripts/test_backtest.py

테스트 이름이 곧 명세다. 기대값은 손으로 계산한 값이며 코드의 식을 되풀이하지 않는다.
"""
import math
import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import backtest as bt  # noqa: E402

EOK = 1e8  # 1억 원


def fin(corp, year, fs, rev_eok, op_eok, roe):
    return {"corp_code": corp, "bsns_year": year, "fs_div": fs,
            "revenue": rev_eok * EOK, "operating_income": op_eok * EOK, "roe_pct": roe}


def path(corp, fs, revs, opm=10.0, roe=15.0, start=2013):
    """start 년부터 매출 경로(억)를 깔고 이익률·ROE 는 고정한다."""
    return [fin(corp, start + i, fs, r, r * opm / 100, roe) for i, r in enumerate(revs)]


CO = {"corp_code": "C1", "stock_code": "000001", "name": "가", "sector_code": "5821"}
TOP10 = bt.Rule(name="탑10", prefixes=(), span=4, min_cagr=0.10, min_opm=8.0, min_roe=12.0, min_rev_eok=300.0)


class 시점(unittest.TestCase):

    def test_리밸런스_날에는_그날까지_접수된_사업보고서만_읽는다(self):
        """3월 결산 공시 전에 그해 실적을 쓰면 미래를 본다."""
        filed = {"C1": {2016: date(2017, 3, 31), 2017: date(2018, 4, 2)}}
        self.assertEqual(bt.latest_year(filed, "C1", [2016, 2017], date(2018, 4, 1)), 2016)
        self.assertEqual(bt.latest_year(filed, "C1", [2016, 2017], date(2018, 4, 2)), 2017)

    def test_결산월이_12월이_아니면_보고서_앞_해의_실적으로_친다(self):
        """사업연도를 늦게 잡는 쪽으로 틀려야 미래를 보지 않는다. 정정공시는 최초 접수일이 아니다."""
        self.assertEqual(bt.report_year("사업보고서 (2017.12)"), 2017)
        self.assertEqual(bt.report_year("사업보고서 (2026.02)"), 2025)
        self.assertIsNone(bt.report_year("[기재정정]사업보고서 (2017.12)"))
        self.assertIsNone(bt.report_year("반기보고서 (2017.06)"))

    def test_접수일을_모르면_다음_해_4월_1일부터_쓴다(self):
        """사업보고서 마감이 3월 말이다."""
        self.assertEqual(bt.latest_year({}, "C1", [2016, 2017], date(2018, 3, 31)), 2016)
        self.assertEqual(bt.latest_year({}, "C1", [2016, 2017], date(2018, 4, 1)), 2017)


class 스크린(unittest.TestCase):

    def run_screen(self, rows, rule=TOP10, companies=(CO,), d=date(2018, 4, 1)):
        return bt.screen(list(companies), rows, {}, d, rule)

    def test_유니버스는_KSIC_접두로_긁는다(self):
        """5821 과 58211 은 같은 산업이다. 582 나 5822 는 아니다."""
        cos = [dict(CO, corp_code=c, stock_code=c, sector_code=s)
               for c, s in (("A", "5821"), ("B", "58211"), ("C", "582"), ("D", "5822"))]
        rows = [r for c in "ABCD" for r in path(c, "CFS", [300, 330, 363, 399.3, 439.23])]
        rule = bt.Rule(**dict(TOP10.__dict__, prefixes=("5821",)))
        picked = {p["corp_code"] for p in self.run_screen(rows, rule, cos)}
        self.assertEqual(picked, {"A", "B"})

    def test_매출_CAGR_은_구간_양_끝이_다_있고_양수일_때만_잰다(self):
        """한쪽이 비면 탈락이지 0 이 아니다."""
        full = path("C1", "CFS", [300, 330, 363, 399.3, 439.23])
        self.assertEqual(len(self.run_screen(full)), 1)
        no_start = [r for r in full if r["bsns_year"] != 2013]
        self.assertEqual(self.run_screen(no_start), [])
        neg_start = [dict(r, revenue=-1.0) if r["bsns_year"] == 2013 else r for r in full]
        self.assertEqual(self.run_screen(neg_start), [])

    def test_탑10_컷의_경계값은_통과한다(self):
        """CAGR 10% · OPM 8% · ROE 12% · 매출 300억 을 딱 맞춘 회사는 들어간다."""
        # 300 / 1.1^4 = 204.904... 에서 정확히 10% 로 300억에 닿는다
        start = 300 / 1.1 ** 4
        rows = path("C1", "CFS", [start, 0, 0, 0, 300], opm=8.0, roe=12.0)
        self.assertEqual(len(self.run_screen(rows)), 1)

    def test_탑10_컷의_경계_바로_아래는_떨어진다(self):
        """OPM 7.99% 는 8% 가 아니다."""
        start = 300 / 1.1 ** 4
        self.assertEqual(self.run_screen(path("C1", "CFS", [start, 0, 0, 0, 300], opm=7.99, roe=12.0)), [])
        self.assertEqual(self.run_screen(path("C1", "CFS", [start, 0, 0, 0, 300], opm=8.0, roe=11.99)), [])
        self.assertEqual(self.run_screen(path("C1", "CFS", [start, 0, 0, 0, 299.9], opm=8.0, roe=12.0)), [])

    def test_연결이_없으면_별도로_읽고_기준을_적는다(self):
        """종속회사가 없으면 연결이 아예 없다."""
        picked = self.run_screen(path("C1", "OFS", [300, 330, 363, 399.3, 439.23]))
        self.assertEqual([p["fs_div"] for p in picked], ["OFS"])
        both = path("C1", "OFS", [300, 330, 363, 399.3, 439.23]) + path("C1", "CFS", [300, 330, 363, 399.3, 439.23])
        self.assertEqual([p["fs_div"] for p in self.run_screen(both)], ["CFS"])


D0, D1, D2, D3 = date(2018, 4, 2), date(2018, 4, 3), date(2018, 4, 4), date(2018, 4, 5)


class 모의운용(unittest.TestCase):

    def test_그날_시세가_있는_종목만_산다(self):
        """오늘 상장사로 거르면 생존 편향이다. 시세가 없으면 사지 않고 따로 적는다."""
        prices = {"A": [(D0, 100.0), (D1, 110.0)], "B": [(D1, 50.0)]}
        res = bt.simulate([(D0, ["A", "B"])], prices, [D0, D1])
        self.assertEqual(res["periods"][0]["held"], ["A"])
        self.assertEqual(res["periods"][0]["skipped"], ["B"])
        self.assertAlmostEqual(res["nav"][-1][1], 1.10)

    def test_보유_중_상장폐지되면_마지막_종가로_현금화하고_표시한다(self):
        """시세가 끊긴 날 이후 값은 마지막 종가에 묶인다."""
        prices = {"A": [(D0, 100.0), (D1, 80.0)], "B": [(D0, 100.0), (D1, 100.0), (D2, 120.0), (D3, 120.0)]}
        res = bt.simulate([(D0, ["A", "B"])], prices, [D0, D1, D2, D3])
        self.assertAlmostEqual(res["nav"][-1][1], 0.5 * 0.8 + 0.5 * 1.2)
        self.assertEqual(res["periods"][0]["delisted"], [("A", D1)])

    def test_종목은_동일_비중이고_다음_리밸런스까지_그대로_둔다(self):
        """사이에 비중을 다시 맞추지 않는다."""
        prices = {"A": [(D0, 100.0), (D1, 110.0), (D2, 121.0)], "B": [(D0, 50.0), (D1, 50.0), (D2, 25.0)]}
        res = bt.simulate([(D0, ["A", "B"])], prices, [D0, D1, D2])
        self.assertEqual([round(v, 4) for _, v in res["nav"]], [1.0, 1.05, 0.855])

    def test_다음_리밸런스에서_그때의_값으로_다시_동일_비중을_맞춘다(self):
        """앞 기간의 끝 값이 다음 기간의 시작 값이다."""
        prices = {"A": [(D0, 100.0), (D1, 120.0), (D2, 120.0)], "B": [(D1, 10.0), (D2, 5.0)]}
        res = bt.simulate([(D0, ["A"]), (D1, ["A", "B"])], prices, [D0, D1, D2])
        self.assertAlmostEqual(res["nav"][-1][1], 1.2 * (0.5 * 1.0 + 0.5 * 0.5))

    def test_고른_종목이_없는_해는_현금으로_두고_표에_적는다(self):
        prices = {"A": [(D0, 100.0), (D1, 200.0)]}
        res = bt.simulate([(D0, [])], prices, [D0, D1])
        self.assertEqual([v for _, v in res["nav"]], [1.0, 1.0])
        self.assertTrue(res["periods"][0]["cash"])


class 지표(unittest.TestCase):

    def test_수익률_변동성_최대낙폭을_낸다(self):
        """변동성은 일간 수익률 표본표준편차 × √252 다."""
        nav = [(date(2018, 1, 1 + i), v) for i, v in enumerate([1.0, 1.1, 0.88, 0.968])]
        m = bt.metrics(nav)
        self.assertAlmostEqual(m["total_return"], -0.032)
        self.assertAlmostEqual(m["max_drawdown"], -0.2)
        self.assertAlmostEqual(m["volatility"], math.sqrt(0.03) * math.sqrt(252))

    def test_지수는_포트폴리오와_같은_기간으로_잰다(self):
        """기간이 다르면 비교가 안 된다. 앞선 지수 이력은 버린다."""
        nav = [(D1, 1.0), (D2, 1.1)]
        index = [(D0, 50.0), (D1, 100.0), (D2, 105.0), (D3, 200.0)]
        cmp = bt.compare(nav, index)
        self.assertAlmostEqual(cmp["index"]["total_return"], 0.05)
        self.assertAlmostEqual(cmp["excess_total"], 0.05)


if __name__ == "__main__":
    unittest.main()
