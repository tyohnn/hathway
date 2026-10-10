#!/usr/bin/env python3
"""리밸런싱 백테스터 — screen.py 의 채를 과거 날짜에서 다시 돌린다.

각 리밸런스 날에 **그날까지 접수된 사업보고서만** 읽어 채를 다시 치고, 고른 종목을
동일 비중으로 사서 다음 리밸런스까지 그대로 둔다. 같은 기간의 지수와 비교해
수익률 · 변동성 · 최대낙폭 · 초과수익을 낸다.

  snapshot  원격 DB 에서 재무 스냅샷을 받는다 (screen.py 와 같은 접속)
  picks     재무 스냅샷으로 리밸런스 날마다 채를 친다 (시세 불필요)
  run       picks 에 시세를 붙여 모의운용하고 결과표를 낸다

판정은 파일 위에서 한다. 재무는 `fin_periods`(연간)와 `filings`(사업보고서 최초 접수일)를
JSON 하나로 받아 두고, 시세는 DB 에 없으므로 CSV 로 받는다.
파일 형식은 README 대신 아래 load_* 함수의 docstring 이 정본이다. 표준 라이브러리만 쓴다.

알고 쓰는 한계:
- `fin_periods` 는 정정공시가 반영된 **지금의 값**이다. 기본값은 그 숫자가 공개된 날(정정본 접수일)부터
  쓴다. 정정 전 원본의 숫자는 DB 에 없어서, 원본이 나온 뒤 정정 전까지의 판단은 재현하지 못하고 미룬다.
- 상장폐지 · 비상장 회사는 DB 에 재무가 없다. 망한 회사가 채에 들어오지 못해 결과가 좋게 나온다.
- 지수는 가격지수다. 배당을 넣지 않은 종목 수정종가와 짝을 맞춘다.
"""
import argparse
import csv
import json
import math
import re
import sys
from dataclasses import dataclass
from datetime import date

EPS = 1e-9  # 경계값 비교. 컷과 같은 값이 부동소수 오차로 한 끗 모자라 떨어지지 않게 한다.
EOK = 1e8


@dataclass(frozen=True)
class Rule:
    """채 하나. prefixes 가 비면 전 상장사다."""
    name: str
    prefixes: tuple
    span: int            # CAGR 구간(년). 4 면 5개년 양 끝이다
    min_cagr: float      # 0.10 = 10%
    min_opm: float       # %
    min_roe: float       # %. None 이면 보지 않는다
    min_rev_eok: float   # 억원


# 「전 상장사 탑10」 H4 컷(리서치/산업/소외성장/2026-08-27-탑10-채.md).
TOP10 = Rule("탑10", (), 4, 0.10, 8.0, 12.0, 300.0)


# ───────────────────────────── 시점

def available_from(filed, corp, year):
    """그해 사업보고서를 쓸 수 있게 되는 날. 접수일을 모르면 다음 해 4월 1일이다."""
    known = filed.get(corp, {}).get(year)
    return known if known else date(year + 1, 4, 1)


def report_year(report_nm):
    """사업보고서 제목에서 사업연도를 읽는다. 정정공시와 다른 보고서는 None.

    12월 결산이 아니면 제목의 연도는 결산이 끝난 해다(2026.02 는 2025년 3월에 시작한 해).
    DART 의 bsns_year 가 그 앞 해인지 같은 해인지 단정할 수 없으므로 앞 해로 친다 —
    틀리더라도 실적을 한 해 늦게 쓰는 쪽이라 미래를 보지 않는다.
    """
    m = re.match(r"사업보고서 \((\d{4})\.(\d{2})\)", report_nm or "")
    if not m:
        return None
    y, mm = int(m.group(1)), int(m.group(2))
    return y if mm == 12 else y - 1


def latest_year(filed, corp, years, d):
    """d 에 읽을 수 있는 가장 최근 사업연도. 없으면 None."""
    ok = [y for y in years if available_from(filed, corp, y) <= d]
    return max(ok) if ok else None


# ───────────────────────────── 채

def _num(v):
    try:
        return None if v is None else float(v)
    except (TypeError, ValueError):
        return None


def screen(companies, fin_rows, filed, d, rule):
    """d 에 rule 을 통과한 회사 목록. 각 항목에 판정에 쓴 연도와 기준(fs_div)을 싣는다."""
    by_corp = {}
    for r in fin_rows:
        by_corp.setdefault(r["corp_code"], {})[(int(r["bsns_year"]), r["fs_div"])] = r
    out = []
    for co in companies:
        sc = co.get("sector_code") or ""
        if rule.prefixes and not sc.startswith(tuple(rule.prefixes)):
            continue
        rows = by_corp.get(co["corp_code"])
        if not rows:
            continue
        y = latest_year(filed, co["corp_code"], sorted({k[0] for k in rows}), d)
        if y is None:
            continue
        # 같은 기준으로 양 끝이 다 있어야 잰다. 연결 우선, 없으면 별도.
        fs = next((f for f in ("CFS", "OFS") if (y, f) in rows and (y - rule.span, f) in rows), None)
        if fs is None:
            continue
        end, start = rows[(y, fs)], rows[(y - rule.span, fs)]
        rev, rev0 = _num(end.get("revenue")), _num(start.get("revenue"))
        op, roe = _num(end.get("operating_income")), _num(end.get("roe_pct"))
        if not rev or not rev0 or rev <= 0 or rev0 <= 0 or op is None:
            continue
        cagr = (rev / rev0) ** (1 / rule.span) - 1
        opm = op / rev * 100
        if cagr < rule.min_cagr - EPS or opm < rule.min_opm - EPS or rev < rule.min_rev_eok * EOK * (1 - EPS):
            continue
        if rule.min_roe is not None and (roe is None or roe < rule.min_roe - EPS):
            continue
        out.append({"corp_code": co["corp_code"], "stock_code": co.get("stock_code"),
                    "name": co.get("name"), "year": y, "fs_div": fs,
                    "cagr": cagr, "opm": opm, "roe": roe, "rev_eok": rev / EOK})
    return out


# ───────────────────────────── 모의운용

def _price_on(series, day):
    """day 의 종가. 그날 거래가 없으면 None."""
    for d, p in series:
        if d == day:
            return p
        if d > day:
            return None
    return None


def _last_on_or_before(series, day):
    last = None
    for d, p in series:
        if d > day:
            break
        last = (d, p)
    return last


def simulate(schedule, prices, calendar):
    """schedule = [(리밸런스 날, [종목코드…]), …]. calendar 는 거래일(지수의 날짜)이다.

    리밸런스 날 이후 첫 거래일에 산다. 그날 종가가 없는 종목은 사지 않는다.
    보유 중 시세가 끊기면 마지막 종가에 묶어 현금처럼 둔다.
    """
    calendar = sorted(calendar)
    trade_days = []
    for d, codes in schedule:
        t = next((c for c in calendar if c >= d), None)
        if t is not None:
            trade_days.append((t, codes))
    nav, periods, value = [], [], 1.0
    for i, (t, codes) in enumerate(trade_days):
        t_end = trade_days[i + 1][0] if i + 1 < len(trade_days) else calendar[-1]
        held = [c for c in codes if _price_on(prices.get(c, []), t) is not None]
        skipped = [c for c in codes if c not in held]
        shares = {c: value / len(held) / _price_on(prices[c], t) for c in held}
        days = [c for c in calendar if t <= c <= t_end]
        if i > 0:
            days = days[1:]  # 리밸런스 날은 앞 기간의 마지막 날로 이미 찍혔다
        start_value = value
        for day in days:
            if held:
                value = sum(s * _last_on_or_before(prices[c], day)[1] for c, s in shares.items())
            nav.append((day, value))
        delisted = []
        for c in held:
            last_d = prices[c][-1][0]
            if last_d < t_end:
                delisted.append((c, last_d))
        periods.append({"start": t, "end": t_end, "held": held, "skipped": skipped,
                        "delisted": delisted, "cash": not held,
                        "return": value / start_value - 1})
    return {"nav": nav, "periods": periods}


# ───────────────────────────── 지표

def metrics(nav):
    vals = [v for _, v in nav]
    rets = [b / a - 1 for a, b in zip(vals, vals[1:])]
    total = vals[-1] / vals[0] - 1
    years = (nav[-1][0] - nav[0][0]).days / 365.25
    cagr = (vals[-1] / vals[0]) ** (1 / years) - 1 if years > 0 and vals[-1] > 0 else None
    if len(rets) > 1:
        mean = sum(rets) / len(rets)
        vol = math.sqrt(sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)) * math.sqrt(252)
    else:
        vol = None
    peak, mdd = vals[0], 0.0
    for v in vals:
        peak = max(peak, v)
        mdd = min(mdd, v / peak - 1)
    return {"total_return": total, "cagr": cagr, "volatility": vol, "max_drawdown": mdd}


def compare(nav, index):
    """지수를 포트폴리오의 날짜에 맞춰 자른 뒤 같은 지표를 낸다."""
    days = {d for d, _ in nav}
    idx = [(d, v) for d, v in index if d in days]
    if len(idx) != len(nav):
        sys.exit(f"[backtest] 지수 날짜가 포트폴리오와 맞지 않는다 ({len(idx)} / {len(nav)}).")
    p, i = metrics(nav), metrics(idx)
    return {"portfolio": p, "index": i,
            "excess_total": p["total_return"] - i["total_return"],
            "excess_cagr": None if p["cagr"] is None or i["cagr"] is None else p["cagr"] - i["cagr"]}


# ───────────────────────────── 입력

def _d(s):
    return date.fromisoformat(s[:10])


def load_snapshot(path):
    """재무 스냅샷 JSON.

    {"companies": [{corp_code, stock_code, name, market, sector_code}],
     "fin": [{corp_code, bsns_year, fs_div, revenue, operating_income, roe_pct}],   # fin_periods 연간(A)
     "filed": {corp_code: {"2017": "2018-04-02", …}}}                              # 최초 사업보고서 접수일
    """
    with open(path, encoding="utf-8") as fh:
        snap = json.load(fh)
    filed = {c: {int(y): _d(v) for y, v in ys.items()} for c, ys in snap.get("filed", {}).items()}
    return snap["companies"], snap["fin"], filed


def load_prices(path):
    """시세 CSV. 열은 code,date,close 이고 close 는 수정종가다. 지수는 code 에 KOSPI · KOSDAQ 을 쓴다."""
    out = {}
    with open(path, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            if row.get("close") in (None, ""):
                continue
            out.setdefault(row["code"].strip(), []).append((_d(row["date"]), float(row["close"])))
    for s in out.values():
        s.sort()
    return out


def rebalance_dates(first, last, month=4, day=1):
    return [date(y, month, day) for y in range(first, last + 1)]


def rule_from_args(a):
    return Rule(a.name, tuple(a.prefix or ()), a.span, a.min_cagr / 100, a.min_opm,
                None if a.min_roe is None else a.min_roe, a.min_rev)


# ───────────────────────────── 명령

def cmd_snapshot(a):
    """원격 DB 에서 재무 스냅샷을 받는다. 접속은 screen.py 와 같다(환경변수 → apps/web/.env.local).

    --dates available(기본): `fin_periods.available_dt` — 저장된 숫자 그대로가 공개된 날. DART 는 정정된
      최신본을 주므로 숫자가 원본보다 몇 주 뒤 정정공시에서 왔을 수 있다. 이 날짜를 써야 미래를 보지 않는다.
      이 컬럼은 「재무 수치에 공시일 붙이기」 작업이 더한다. 없으면 PostgREST 가 400 을 낸다.
    --dates first: 사업보고서 원본의 최초 접수일. 정정이 숫자를 안 바꿨다고 가정할 때만 쓴다.
    """
    import screen as sc
    url, key = sc.credentials()
    companies = sc.get("companies", {"select": "corp_code,stock_code,name,market,sector_code",
                                     "order": "corp_code"}, url, key)
    cols = "corp_code,bsns_year,fs_div,revenue,operating_income,roe_pct"
    if a.dates == "available":
        cols += ",available_dt"
    fin_rows = sc.get("fin_periods", {"select": cols, "period_type": "eq.A",
                                      "order": "corp_code,bsns_year,fs_div"}, url, key)
    filed = {}
    if a.dates == "available":
        for r in fin_rows:
            d = r.pop("available_dt", None)
            if not d:
                continue
            ys = filed.setdefault(r["corp_code"], {})
            y = str(r["bsns_year"])
            if y not in ys or d > ys[y]:
                ys[y] = d  # 연결과 별도가 다른 공시에서 왔으면 늦은 쪽
    else:
        print("[backtest] 원본 접수일을 쓴다. 정정공시로 바뀐 숫자를 미리 볼 수 있다.", file=sys.stderr)
        filings = sc.get("filings", {
            "select": "corp_code,report_nm,rcept_dt",
            "report_nm": "like.사업보고서 (*", "order": "rcept_no",
        }, url, key)
        for f in filings:
            y = report_year(f["report_nm"])
            if y is None:
                continue
            ys = filed.setdefault(f["corp_code"], {})
            y = str(y)
            if y not in ys or f["rcept_dt"] < ys[y]:
                ys[y] = f["rcept_dt"]
    json.dump({"companies": companies, "fin": fin_rows, "filed": filed, "dates": a.dates},
              sys.stdout, ensure_ascii=False)


def cmd_picks(a):
    companies, fin_rows, filed = load_snapshot(a.snapshot)
    if a.listed_only:
        # 지금의 시장 구분은 생존 편향을 부른다. 과거 상장 여부는 run 이 시세로 다시 가린다.
        companies = [c for c in companies if c.get("market") in ("KOSPI", "KOSDAQ")]
    rule = rule_from_args(a)
    out = []
    for d in rebalance_dates(a.first, a.last):
        picks = screen(companies, fin_rows, filed, d, rule)
        out.append({"date": d.isoformat(), "picks": [{**p, "cagr": round(p["cagr"] * 100, 2),
                                                      "opm": round(p["opm"], 2),
                                                      "rev_eok": round(p["rev_eok"], 1)} for p in picks]})
    json.dump({"rule": rule.__dict__, "rebalances": out}, sys.stdout, ensure_ascii=False, indent=1)


def pct(v, sign=True):
    if v is None:
        return "—"
    return f"{v * 100:+.1f}%" if sign else f"{v * 100:.1f}%"


def cmd_run(a):
    with open(a.picks, encoding="utf-8") as fh:
        picks = json.load(fh)
    prices = load_prices(a.prices)
    index = prices.get(a.index)
    if not index:
        sys.exit(f"[backtest] 시세 파일에 지수 {a.index} 가 없다.")
    end = _d(a.end) if a.end else index[-1][0]
    schedule = [(_d(r["date"]), [p["stock_code"] for p in r["picks"] if p.get("stock_code")])
                for r in picks["rebalances"] if _d(r["date"]) < end]
    calendar = [d for d, _ in index if schedule and schedule[0][0] <= d <= end]
    res = simulate(schedule, prices, calendar)
    cmp = compare(res["nav"], index)
    label = a.label or picks["rule"]["name"]
    print(f"## {label} — {res['nav'][0][0]} ~ {res['nav'][-1][0]} · 비교 지수 {a.index}")
    print()
    if a.sample_note:
        print(f"> ⚠ {a.sample_note}")
        print()
    print("| | 총수익률 | 연환산 | 변동성(연) | 최대낙폭 |")
    print("|---|---|---|---|---|")
    for k, nm in (("portfolio", "채"), ("index", a.index)):
        m = cmp[k]
        print(f"| {nm} | {pct(m['total_return'])} | {pct(m['cagr'])} | {pct(m['volatility'], sign=False)} | {pct(m['max_drawdown'])} |")
    print(f"| 초과 | {pct(cmp['excess_total'])} | {pct(cmp['excess_cagr'])} | | |")
    print()
    print("| 기간 | 고름 | 삼 | 시세 없어 못 삼 | 중도 상폐·정지 | 수익률 |")
    print("|---|---|---|---|---|---|")
    for p, (_, codes) in zip(res["periods"], schedule):
        print(f"| {p['start']}~{p['end']} | {len(codes)} | {'현금' if p['cash'] else len(p['held'])} | "
              f"{len(p['skipped'])} | {len(p['delisted'])} | {pct(p['return'])} |")


def main():
    ap = argparse.ArgumentParser(description="리밸런싱 백테스터 (screen.py 채의 과거 재현)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("snapshot", help="원격 DB 에서 재무 스냅샷 JSON 을 받는다 (stdout)")
    s.add_argument("--dates", choices=["available", "first"], default="available",
                   help="재무를 쓸 수 있게 되는 날. available=저장된 숫자가 공개된 날(정정본), first=원본 접수일")
    s.set_defaults(func=cmd_snapshot)

    p = sub.add_parser("picks", help="리밸런스 날마다 채를 친다 (JSON 을 stdout 으로)")
    p.add_argument("snapshot", help="재무 스냅샷 JSON (load_snapshot 참고)")
    p.add_argument("--first", type=int, required=True, help="첫 리밸런스 연도")
    p.add_argument("--last", type=int, required=True, help="마지막 리밸런스 연도")
    p.add_argument("--name", default="탑10")
    p.add_argument("--prefix", nargs="*", help="KSIC 접두. 비우면 전 업종")
    p.add_argument("--span", type=int, default=4)
    p.add_argument("--min-cagr", type=float, default=10.0, help="%%")
    p.add_argument("--min-opm", type=float, default=8.0, help="%%")
    p.add_argument("--min-roe", type=float, default=12.0, help="%%")
    p.add_argument("--min-rev", type=float, default=300.0, help="억원")
    p.add_argument("--listed-only", action="store_true", help="지금 KOSPI/KOSDAQ 인 회사만 (생존 편향 주의)")
    p.set_defaults(func=cmd_picks)

    r = sub.add_parser("run", help="picks 에 시세를 붙여 모의운용")
    r.add_argument("picks", help="picks 명령의 출력 JSON")
    r.add_argument("prices", help="시세 CSV (load_prices 참고)")
    r.add_argument("--index", default="KOSPI")
    r.add_argument("--end", help="마지막 날 (YYYY-MM-DD). 비우면 지수의 마지막 날")
    r.add_argument("--label")
    r.add_argument("--sample-note", help="임시 표본이면 그 사실을 표 위에 적는다")
    r.set_defaults(func=cmd_run)

    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
