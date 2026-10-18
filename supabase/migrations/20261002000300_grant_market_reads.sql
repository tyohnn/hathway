-- web 이 적재된 시장 데이터를 `pg` 로 직접 읽는다. 그 표들을 앱의 롤에 읽기로 연다.
--
-- 지금까지 web 은 이 표들을 PostgREST 로, service_role 로 읽었다(RLS 를 켜고 정책 없이 anon · authenticated 를 닫아 둔
-- 채로). 읽는 길을 web_app 으로 옮기면서 그 롤에 SELECT 를 준다. service_role 의 권한은 그대로 둔다. 적재
-- (`platform/ingest`)가 그 롤로 쓴다.
--
-- ⚠ **읽기만 준다.** 이 표들은 적재가 쓰고 앱은 읽기만 한다. INSERT · UPDATE · DELETE 를 주지 않는다.
-- ⚠ **표 단위로 준다.** `org` 는 컬럼 단위로 열지만 여기는 공시된 데이터라 가릴 칸이 없다. 넓은 표(`fin_periods`)에 칸이
--    늘 때마다 GRANT 를 고치지 않아도 된다.
-- ⚠ **앱이 읽는 표만 연다.** 원본 사실(`financial_facts`) · 적재 진행 · 등록 서류처럼 앱이 읽지 않는 표는 열지 않는다.
--    새 표를 읽게 되면 여기 같은 모양의 줄을 더한 마이그레이션을 쓴다.
-- ⚠ `filing_correction_chains` 는 뷰다. 뷰의 주인 권한으로 `filings` 를 읽으므로 뷰에 SELECT 만 있으면 된다.

grant select on public.companies to web_app;
grant select on public.fin_periods to web_app;
grant select on public.filings to web_app;
grant select on public.filing_correction_chains to web_app;
grant select on public.events to web_app;
grant select on public.ownership_txns to web_app;
grant select on public.trackings to web_app;
