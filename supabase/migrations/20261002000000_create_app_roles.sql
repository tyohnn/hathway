-- 앱이 DB 에 붙을 때 쓰는 전용 롤. web 앱은 web_app 으로 붙는다.
--
-- 지금까지 web 은 PostgREST 를 service_role 로 지나 읽고 썼다. 로그인을 들이면서 쓰는 길(리서치 보드)부터 `pg` 직결로
-- 옮긴다. 조회는 아직 service_role 그대로다(docs/개발-방법론.md 「스캐폴드와 다른 자리」).
--
-- ⚠ **롤은 앱(붙는 프로세스)당 하나다.** 스키마당 하나가 아니다. 앱이 새 표를 읽게 되면 이 롤에 GRANT 를 더한다.
-- ⚠ **이 파일은 이름만 만든다.** LOGIN · BYPASSRLS 속성과 비밀번호는 여기 두지 않는다. 비밀번호는 커밋되고
--    `schema_migrations.statements` 에도 남는다. 로컬은 `seeds/org.sql`, 원격은 Management API 가 넣는다.
-- ⚠ 롤은 **클러스터 수준** 객체라 `db reset` 을 지나도 남는다. `if not exists` 가드가 없으면 두 번째 reset 이 깨진다.

do $$
begin
    if not exists (select 1 from pg_roles where rolname = 'web_app') then
        create role web_app;
    end if;
end
$$;

comment on role web_app is
    'web 앱 전용 DB 접속 롤. LOGIN·BYPASSRLS·비밀번호는 마이그레이션 밖에서 부여한다';
