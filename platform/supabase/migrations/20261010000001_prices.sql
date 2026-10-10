-- 일별 시세 · 상장주식수 · 벤치마크 지수.
--
-- 지금까지 주가와 시가총액은 DB 에 없어서 분석마다 다음금융에서 손으로 받았다. 백테스트를 하려면
-- 전 종목의 일별 시세가 필요하고, 상장폐지된 종목이 빠지면 수익률이 부풀려진다(생존자 편향).
--
-- 소스는 KRX Open API 의 일별매매정보와 지수 일별시세다. 날짜 하나를 부르면 그날 거래된 전 종목이
-- 오므로, 뒤에 상장폐지된 종목도 그 날짜에는 들어 있다. 적재는 `platform/ingest/prices.py` 가 한다.
--
-- ⚠ 원시가만 쌓는다. 수정주가는 `price_adjustments` 의 계수로 `prices_adjusted` 뷰가 계산한다.
--    계수는 KRX 의 기준가에서 얻는다(`platform/ingest/price_rules.py` 참고). 현금배당 계수는
--    kind='dividend' 로 같은 표에 나중에 더한다.
-- ⚠ `companies` 에 FK 를 걸지 않는다. 우선주 · 리츠 · DART 에 없는 상장폐지 종목도 시세는 쌓는다.
--    DART 회사와 이어지는 종목만 `securities.corp_code` 를 채운다.

-- ───────────────────────────── 종목 우주 (한 번이라도 거래된 모든 종목)
create table securities (
  stock_code   text primary key,          -- 6자리 단축코드
  name         text not null,             -- 마지막으로 거래된 날의 종목명
  market       text not null,             -- 마지막으로 거래된 날의 시장 (KOSPI | KOSDAQ | KONEX)
  first_traded date not null,
  last_traded  date not null,             -- 최근 영업일보다 이르면 상장폐지 또는 장기 거래정지
  corp_code    text references companies on delete set null,
  updated_at   timestamptz not null default now()
);
create index securities_corp on securities (corp_code) where corp_code is not null;

-- ───────────────────────────── 일별 시세 (원시가)
create table prices_daily (
  stock_code    text not null,
  trade_date    date not null,
  market        text not null,
  open          bigint,
  high          bigint,
  low           bigint,
  close         bigint not null,
  change        bigint,                   -- 기준가 대비. 기준가 = close - change
  volume        bigint,
  trade_value   bigint,
  market_cap    bigint,
  shares_listed bigint,
  primary key (stock_code, trade_date)
);
-- 백테스트는 "그날의 전 종목"을 자주 읽는다.
create index prices_daily_date on prices_daily (trade_date);

-- ───────────────────────────── 조정 계수
create table price_adjustments (
  stock_code text not null,
  ex_date    date not null,
  kind       text not null check (kind in ('capital', 'dividend')),
  factor     double precision not null check (factor > 0),  -- ex_date 앞의 가격에 곱한다
  primary key (stock_code, ex_date, kind)
);

-- ───────────────────────────── 벤치마크 지수
create table index_daily (
  index_code  text not null,              -- KOSPI | KOSDAQ | KOSPI200 | KOSDAQ150 …
  trade_date  date not null,
  open        double precision,
  high        double precision,
  low         double precision,
  close       double precision not null,
  volume      bigint,
  trade_value bigint,
  market_cap  bigint,
  primary key (index_code, trade_date)
);

-- ───────────────────────────── 수정주가
-- 그 날짜 뒤에 생긴 계수들의 곱을 원시가에 곱한다. 곱은 exp(sum(ln)) 로 구한다.
-- security_invoker 로 두어 기반 표의 권한을 그대로 따른다.
create view prices_adjusted with (security_invoker = true) as
select p.stock_code,
       p.trade_date,
       p.close,
       coalesce(f.factor, 1) as adj_factor,
       p.open  * coalesce(f.factor, 1) as adj_open,
       p.high  * coalesce(f.factor, 1) as adj_high,
       p.low   * coalesce(f.factor, 1) as adj_low,
       p.close * coalesce(f.factor, 1) as adj_close,
       p.volume,
       p.market_cap,
       p.shares_listed
from prices_daily p
left join lateral (
  select exp(sum(ln(a.factor))) as factor
  from price_adjustments a
  where a.stock_code = p.stock_code
    and a.ex_date > p.trade_date
    and a.kind = 'capital'
) f on true;

-- ───────────────────────────── 종목 우주 갱신
-- 적재가 한 구간을 쓴 뒤 그 구간의 종목별 요약을 넘긴다. 처음 · 마지막 거래일은 넓히기만 하고,
-- 이름과 시장은 더 늦은 날의 것으로 바꾼다. 구간을 어떤 순서로 적재해도 결과가 같다.
-- rows: [{"stock_code","name","market","first_traded","last_traded"}, …]
create function prices_upsert_securities(rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into securities as s (stock_code, name, market, first_traded, last_traded, corp_code)
  select r.stock_code, r.name, r.market, r.first_traded, r.last_traded, c.corp_code
  from jsonb_to_recordset(rows)
       as r(stock_code text, name text, market text, first_traded date, last_traded date)
  left join companies c on c.stock_code = r.stock_code
  on conflict (stock_code) do update set
    first_traded = least(s.first_traded, excluded.first_traded),
    last_traded  = greatest(s.last_traded, excluded.last_traded),
    name   = case when excluded.last_traded >= s.last_traded then excluded.name   else s.name   end,
    market = case when excluded.last_traded >= s.last_traded then excluded.market else s.market end,
    corp_code  = coalesce(excluded.corp_code, s.corp_code),
    updated_at = now();
$$;

-- ───────────────────────────── 권한 (20260802000005 의 원칙: 거부는 두 겹)
alter table securities        enable row level security;
alter table prices_daily      enable row level security;
alter table price_adjustments enable row level security;
alter table index_daily       enable row level security;

revoke all on securities, prices_daily, price_adjustments, index_daily, prices_adjusted
  from anon, authenticated;
grant select, insert, update, delete
  on securities, prices_daily, price_adjustments, index_daily to service_role;
grant select on prices_adjusted to service_role;

revoke all on function prices_upsert_securities(jsonb) from public, anon, authenticated;
grant execute on function prices_upsert_securities(jsonb) to service_role;
