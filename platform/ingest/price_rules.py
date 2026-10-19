"""KRX 일별 시세를 DB 행으로 펴고 권리락 조정 계수를 계산하는 순수 규칙.

네트워크도 DB 도 부르지 않는다. 적재 스크립트(`prices.py`)가 KRX 응답과 직전 거래일 종가를
넘기면 여기서 행과 계수를 만든다. 테스트는 `test_price_rules.py` 에 있다.

조정 계수를 시세만으로 얻는 근거: KRX 의 `전일대비`(CMPPREVDD_PRC)는 전일 종가가 아니라 그날의
**기준가** 대비 값이다. 분할 · 병합 · 무상증자 · 감자 · 유상증자 권리락이 있는 날 KRX 는 기준가를
조정하므로, `기준가 = 종가 − 전일대비` 가 전일 종가와 달라진다. 그 비율(기준가 ÷ 전일 종가)이
그날보다 앞선 가격에 곱할 계수다. 현금배당은 기준가를 조정하지 않으므로 여기서 잡히지 않는다.
"""

# KRX 일별매매정보 응답 필드 → prices_daily 컬럼
PRICE_FIELDS = {
    "open": "TDD_OPNPRC",
    "high": "TDD_HGPRC",
    "low": "TDD_LWPRC",
    "close": "TDD_CLSPRC",
    "change": "CMPPREVDD_PRC",
    "volume": "ACC_TRDVOL",
    "trade_value": "ACC_TRDVAL",
    "market_cap": "MKTCAP",
    "shares_listed": "LIST_SHRS",
}

# KRX 지수 일별시세 응답 필드 → index_daily 컬럼
INDEX_FIELDS = {
    "open": "OPNPRC_IDX",
    "high": "HGPRC_IDX",
    "low": "LWPRC_IDX",
    "close": "CLSPRC_IDX",
    "volume": "ACC_TRDVOL",
    "trade_value": "ACC_TRDVAL",
    "market_cap": "MKTCAP",
}

MARKETS = {"STK": "KOSPI", "KSQ": "KOSDAQ", "KNX": "KONEX"}


def parse_int(value):
    """KRX 숫자 문자열("1,234" · "-" · "")을 정수로 바꾼다. 값이 없으면 None 이다."""
    if value is None:
        return None
    s = str(value).replace(",", "").strip()
    if s in ("", "-"):
        return None
    return int(float(s))


def parse_num(value):
    """지수처럼 소수가 있는 값. 값이 없으면 None 이다."""
    if value is None:
        return None
    s = str(value).replace(",", "").strip()
    if s in ("", "-"):
        return None
    return float(s)


def iso_date(bas_dd):
    """"20240102" → "2024-01-02"."""
    s = str(bas_dd)
    return "%s-%s-%s" % (s[:4], s[4:6], s[6:8])


def normalize_stock_code(isu_cd):
    """단축코드 6자리로 맞춘다. 표준코드(KR7005930003)가 오면 가운데 6자리를 쓴다."""
    s = str(isu_cd).strip()
    if len(s) == 12 and s.startswith("KR"):
        return s[3:9]
    return s


def to_price_row(raw, market):
    """KRX 일별매매정보 한 행 → prices_daily 행. 종가가 없으면 None 을 돌려준다."""
    row = {
        "stock_code": normalize_stock_code(raw["ISU_CD"]),
        "trade_date": iso_date(raw["BAS_DD"]),
        "market": market,
        "name": (raw.get("ISU_NM") or "").strip(),
    }
    for col, field in PRICE_FIELDS.items():
        row[col] = parse_int(raw.get(field))
    if row["close"] is None:
        return None
    return row


def to_index_row(raw, index_code):
    """KRX 지수 일별시세 한 행 → index_daily 행. 종가가 없으면 None 을 돌려준다."""
    row = {"index_code": index_code, "trade_date": iso_date(raw["BAS_DD"])}
    for col, field in INDEX_FIELDS.items():
        conv = parse_num if col in ("open", "high", "low", "close") else parse_int
        row[col] = conv(raw.get(field))
    if row["close"] is None:
        return None
    return row


def base_price(close, change):
    """그날의 기준가. KRX 의 전일대비는 기준가 대비 값이다."""
    return close - change


def capital_factor(prev_close, close, change):
    """그날 권리락이 있었으면 앞선 가격에 곱할 계수를, 없었으면 None 을 돌려준다."""
    if prev_close is None or change is None or not prev_close:
        return None
    base = base_price(close, change)
    if base == prev_close or base <= 0:
        return None
    return base / prev_close


def capital_adjustments(rows, prev_close_by_code):
    """한 구간의 시세 행들에서 권리락 계수를 뽑는다.

    rows 는 to_price_row 의 결과다. prev_close_by_code 는 구간 시작 전 마지막 거래일의 종목별
    종가이고, 이 함수 안에서 날짜 순으로 갱신해 가며 쓴다. 거래정지로 며칠 빠진 종목은 마지막으로
    거래된 날의 종가와 비교한다.
    """
    prev = dict(prev_close_by_code)
    out = []
    for row in sorted(rows, key=lambda r: (r["trade_date"], r["stock_code"])):
        code = row["stock_code"]
        factor = capital_factor(prev.get(code), row["close"], row["change"])
        if factor is not None:
            out.append({
                "stock_code": code,
                "ex_date": row["trade_date"],
                "kind": "capital",
                "factor": factor,
            })
        prev[code] = row["close"]
    return out


def adjusted_close(close, trade_date, adjustments):
    """수정 종가. 그 날짜 뒤에 생긴 계수들을 모두 곱한다. adjustments 는 한 종목의 것이다."""
    factor = 1.0
    for a in adjustments:
        if a["ex_date"] > trade_date:
            factor *= a["factor"]
    return close * factor
