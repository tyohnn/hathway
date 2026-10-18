-- 시드로 넣은 재무 원본(`05-market.sql` 의 financial_facts)에서 파생 지표 `fin_periods` 를 굽는다.
-- 원격은 적재가 끝난 뒤 같은 함수를 손으로 부른다(platform/README.md 「fin_periods 갱신」).
select * from internal.fin_periods_refresh();
