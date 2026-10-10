#!/usr/bin/env python3
"""KRX Open API → 일별 시세 · 상장주식수 · 벤치마크 지수 적재.

처음 한 번의 백필과 날마다의 증분이 같은 코드다. 체크포인트 표는 없고 `prices_daily.max(trade_date)+1일`
에서 다시 시작한다. `daily_sync.py` 와 같은 이유로 쓰는 순서를 정해 둔다.
  1. 한 묶음(기본 20 영업일)을 메모리에 모은다. KRX 쪽이 실패하면 그 묶음은 하나도 쓰지 않는다.
  2. 조정 계수 · 종목 우주 · 지수를 먼저 쓰고 시세를 마지막에 날짜 오름차순으로 쓴다. 시세가 체크포인트라서,
     중간에 실패하면 다음 실행이 그 묶음을 처음부터 다시 받는다. 모든 쓰기가 upsert 라 다시 써도 같다.

조정 계수는 묶음 앞의 마지막 거래일 종가가 있어야 첫날 것도 잡힌다. 그 종가는 DB 에서 읽는다.

KRX Open API 는 서비스마다 이용 신청과 승인이 필요하다: 유가증권 · 코스닥 · 코넥스 일별매매정보,
KOSPI · KOSDAQ 시리즈 일별시세정보. 키는 `KRX_API_KEY`(환경 또는 레포 루트 .env.local)로 받는다.

사용법:
    python3 prices.py --dry-run                              # 대상 구간과 콜 수만
    python3 prices.py --start 2024-01-02 --end 2024-12-30    # 샘플 백필
    python3 prices.py                                        # 증분 (max(trade_date)+1 ~ 오늘)
    python3 prices.py --start 2010-01-04 --markets KOSPI,KOSDAQ,KONEX
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingest            # noqa: E402  rest · upsert · env_setting · print_target 재사용
import price_rules as pr  # noqa: E402

KRX_BASE = ingest.env_setting("KRX_API_BASE", "https://data-dbg.krx.co.kr/svc/apis")
KRX_API_KEY = ingest.env_setting("KRX_API_KEY", "")

STOCK_ENDPOINTS = {
    "KOSPI": "sto/stk_bydd_trd",
    "KOSDAQ": "sto/ksq_bydd_trd",
    "KONEX": "sto/knx_bydd_trd",
}

# 지수 엔드포인트는 시리즈 전체를 돌려준다. 그중 벤치마크로 쓸 것만 남긴다(IDX_NM → index_code).
INDEX_ENDPOINTS = {
    "idx/kospi_dd_trd": {"코스피": "KOSPI", "코스피 200": "KOSPI200"},
    "idx/kosdaq_dd_trd": {"코스닥": "KOSDAQ", "코스닥 150": "KOSDAQ150"},
}

DEFAULT_CHUNK_DAYS = 20
KRX_MAX_ATTEMPTS = 5


def krx_get(path, bas_dd):
    """한 날짜의 OutBlock_1. 휴장일은 빈 목록이 온다."""
    if not KRX_API_KEY:
        raise SystemExit("KRX_API_KEY 가 없다 — 환경변수나 레포 루트 .env.local 에 넣어라")
    url = "%s/%s?%s" % (KRX_BASE, path, urllib.parse.urlencode({"basDd": bas_dd}))
    req = urllib.request.Request(url, headers={"AUTH_KEY": KRX_API_KEY})
    for attempt in range(1, KRX_MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read() or b"{}")
            return body.get("OutBlock_1") or []
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:300]
            if e.code in (401, 403):
                raise RuntimeError("KRX %s %s → %s (키 또는 서비스 이용 승인 확인): %s"
                                   % (path, bas_dd, e.code, detail))
            if attempt == KRX_MAX_ATTEMPTS:
                raise RuntimeError("KRX %s %s → %s: %s" % (path, bas_dd, e.code, detail))
        except (urllib.error.URLError, TimeoutError, ConnectionResetError):
            if attempt == KRX_MAX_ATTEMPTS:
                raise
        time.sleep(min(2 ** attempt, 30))


def weekdays(start, end):
    d = start
    while d <= end:
        if d.weekday() < 5:
            yield d
        d += dt.timedelta(days=1)


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def resolve_start(explicit):
    if explicit:
        return dt.date.fromisoformat(explicit)
    rows = ingest.rest("GET", "prices_daily?select=trade_date&order=trade_date.desc&limit=1")
    if not rows:
        raise SystemExit("prices_daily 가 비어 있다 — 처음 적재는 --start 를 명시해라")
    return dt.date.fromisoformat(rows[0]["trade_date"]) + dt.timedelta(days=1)


def prev_closes_before(day):
    """day 앞의 마지막 거래일 종목별 종가. 거래정지로 그날 행이 없는 종목은 빠진다(첫 거래일 계수를 놓칠
    수 있다 — 종목마다 마지막 행을 찾는 질의는 1,000만 행에서 비싸서 그 손실을 받아들인다)."""
    rows = ingest.rest("GET", "prices_daily?select=trade_date&trade_date=lt.%s"
                              "&order=trade_date.desc&limit=1" % day.isoformat())
    if not rows:
        return {}
    last = rows[0]["trade_date"]
    out, offset = {}, 0
    while True:
        page = ingest.rest("GET", "prices_daily?select=stock_code,close&trade_date=eq.%s"
                                  "&order=stock_code&limit=1000&offset=%d" % (last, offset))
        out.update({r["stock_code"]: r["close"] for r in page})
        if len(page) < 1000:
            return out
        offset += 1000


def fetch_day(day, markets):
    bas_dd = day.strftime("%Y%m%d")
    prices = []
    for market in markets:
        for raw in krx_get(STOCK_ENDPOINTS[market], bas_dd):
            row = pr.to_price_row(raw, market)
            if row is not None:
                prices.append(row)
    indexes = []
    for path, wanted in INDEX_ENDPOINTS.items():
        for raw in krx_get(path, bas_dd):
            code = wanted.get((raw.get("IDX_NM") or "").strip())
            if code:
                row = pr.to_index_row(raw, code)
                if row is not None:
                    indexes.append(row)
    return prices, indexes


def summarize_securities(prices):
    by_code = {}
    for r in sorted(prices, key=lambda r: r["trade_date"]):
        s = by_code.setdefault(r["stock_code"], {
            "stock_code": r["stock_code"], "first_traded": r["trade_date"]})
        s.update(name=r["name"] or r["stock_code"], market=r["market"], last_traded=r["trade_date"])
    return list(by_code.values())


def write_chunk(prices, indexes, prev_close):
    adjustments = pr.capital_adjustments(prices, prev_close)
    if adjustments:
        ingest.upsert("price_adjustments", adjustments, on_conflict="stock_code,ex_date,kind")
    securities = summarize_securities(prices)
    for part in chunks(securities, 1000):
        ingest.rest("POST", "rpc/prices_upsert_securities", {"rows": part})
    if indexes:
        ingest.upsert("index_daily", indexes, on_conflict="index_code,trade_date")
    db_rows = [{k: v for k, v in r.items() if k != "name"} for r in prices]
    db_rows = ingest.dedupe_by(db_rows, ("stock_code", "trade_date"), "prices_daily")
    db_rows.sort(key=lambda r: (r["trade_date"], r["stock_code"]))
    ingest.upsert("prices_daily", db_rows, on_conflict="stock_code,trade_date")
    return len(adjustments), len(securities)


def main():
    p = argparse.ArgumentParser(description="KRX 일별 시세 · 지수 적재")
    p.add_argument("--start", help="시작일 YYYY-MM-DD (기본: prices_daily.max(trade_date)+1일)")
    p.add_argument("--end", help="종료일 YYYY-MM-DD (기본: 오늘)")
    p.add_argument("--markets", default="KOSPI,KOSDAQ", help="쉼표로 구분 (KOSPI,KOSDAQ,KONEX)")
    p.add_argument("--chunk-days", type=int, default=DEFAULT_CHUNK_DAYS)
    p.add_argument("--dry-run", action="store_true", help="KRX 를 부르지 않고 구간과 콜 수만 찍는다")
    args = p.parse_args()

    markets = [m.strip().upper() for m in args.markets.split(",") if m.strip()]
    unknown = [m for m in markets if m not in STOCK_ENDPOINTS]
    if unknown:
        raise SystemExit("모르는 시장: %s" % ", ".join(unknown))

    ingest.print_target()
    start = resolve_start(args.start)
    end = dt.date.fromisoformat(args.end) if args.end else dt.date.today()
    days = list(weekdays(start, end))
    calls = len(days) * (len(markets) + len(INDEX_ENDPOINTS))
    print("대상 구간: %s ~ %s (평일 %d일, KRX 콜 약 %d건)" % (start, end, len(days), calls))
    if args.dry_run or not days:
        return

    prev_close = prev_closes_before(days[0])
    print("직전 거래일 종가: %d종목" % len(prev_close))
    totals = {"days": 0, "prices": 0, "adjustments": 0}
    for group in chunks(days, args.chunk_days):
        prices, indexes = [], []
        for day in group:
            day_prices, day_indexes = fetch_day(day, markets)
            if day_prices:
                totals["days"] += 1
            prices.extend(day_prices)
            indexes.extend(day_indexes)
        if not prices:
            continue
        n_adj, n_sec = write_chunk(prices, indexes, prev_close)
        for r in sorted(prices, key=lambda r: r["trade_date"]):
            prev_close[r["stock_code"]] = r["close"]
        totals["prices"] += len(prices)
        totals["adjustments"] += n_adj
        print("  %s ~ %s: 시세 %d행 · 종목 %d · 조정 계수 %d · 지수 %d행"
              % (group[0], group[-1], len(prices), n_sec, n_adj, len(indexes)))
    print("완료: 거래일 %(days)d일 · 시세 %(prices)d행 · 조정 계수 %(adjustments)d건" % totals)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print("실패: %s" % str(e)[:1000], file=sys.stderr)
        sys.exit(1)
