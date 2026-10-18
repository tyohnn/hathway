-- org: 설정의 팀 화면이 web 에서 사람을 초대하고 역할을 바꾸고 팀에서 뺀다(INV-ACCESS-09).
--
-- 누가 그 일을 할 수 있는지는 여기 없다. `packages/access` 의 `access/team.ts` 가 판정하고, 쓰는 문장이
-- 조건(바꾸기 전 역할 · 살아 있는 멤버십 · 소유주가 아님)을 한 번 더 건다(`TeamDirectoryPostgres`).
--
-- ⚠ **컬럼 단위로 연다.** 앱의 롤은 bypassrls 라 GRANT 가 유일한 경계다. 초기 스키마의 예외
--    (`auth_user_id` 의 UPDATE)에 이것이 둘째로 더해진다. 여전히 web_app 은 남의 주소를 바꾸거나 나간 사람을
--    살리지 못하고(`email` · `deactivated_at`), 멤버십을 다른 사람이나 테넌트로 옮기지 못하고(`account_id` ·
--    `tenant_id`), 테넌트에는 쓰지 못한다.
-- ⚠ **멤버십은 지우지 않고 끊는다(INV-ACCESS-03).** DELETE 를 주지 않는다.
-- ⚠ 테넌트마다 소유주가 하나라는 것은 초기 스키마의 부분 유일 인덱스 `membership_owner_per_tenant` 가
--    막는다(INV-ACCESS-10).

grant insert (email, name) on org.account to web_app;
grant update (name) on org.account to web_app;

grant insert (account_id, tenant_id, role) on org.membership to web_app;
grant update (role, active) on org.membership to web_app;
