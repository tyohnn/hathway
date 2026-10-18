-- agent 앱이 붙는 롤을 세우고 org 를 읽게 한다. 스캐폴드로 옮기면서 agent 앱이 들어왔다.
--
-- ⚠ **롤은 앱(붙는 프로세스)당 하나다.** web 은 `web_app`(20261002000000), agent 는 이 롤로 붙는다.
-- ⚠ LOGIN · BYPASSRLS · 비밀번호는 여기 두지 않는다. 마이그레이션의 SQL 은 `schema_migrations.statements` 에도
--    남기 때문이다. 로컬은 `supabase/seed.sql` 이, 원격은 Management API 가 넣는다.
-- ⚠ 팀 관리의 쓰기는 주지 않는다. 팀 화면은 web 에만 있다.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'agent_app') then
        create role agent_app;
    end if;
end
$$;

comment on role agent_app is
    'agent 앱 전용 DB 접속 롤. LOGIN·BYPASSRLS·비밀번호는 마이그레이션 밖에서 부여한다';

-- 두 앱이 같은 사실을 읽어 각자 문을 판정한다. 앱이 쓰지 않는 칸은 열지 않는다
grant usage on schema org to agent_app;
grant select (id, kind, name, active) on org.tenant to agent_app;
grant select (id, email, name, deactivated_at) on org.account to agent_app;
grant select (auth_user_id), update (auth_user_id) on org.account to agent_app;
grant select (id, account_id, tenant_id, role, active) on org.membership to agent_app;
