-- ============================================================
-- 로컬 개발과 계약 테스트의 시드: 테넌트 · 계정 · 멤버십 · 로컬 로그인 · 앱 롤의 접속 속성.
-- 스캐폴드의 seed.sql 에서 옮겼다.
--
-- ⚠ **`seed.sql` 과 따로 넣는다.** 그 파일은 적재 데이터의 덤프라 `supabase start` 가 돌린다. 이 파일은
--    마이그레이션을 올린 뒤 손으로 한 번 넣는다(platform/README.md 「로그인과 앱 롤」).
-- ⚠ 이 파일은 **커밋된다.** PII 를 넣지 말 것. 전부 합성 데이터다.
-- ⚠ **로컬 전용이다.** 비밀번호를 여기 두는 것이 안전한 이유가 그것이다. 원격에 넣지 않는다.
-- ⚠ **id 는 고정이다.** 계약 테스트(`packages/*/src/testing/contracts`)와 테스트 전용 행위자
--    (`packages/access/src/testing/actor.ts`)가 이 값을 상수로 들고 있다. 바꾸면 함께 고친다.
-- ⚠ 운영팀(1)은 마이그레이션(`20261002000200`)이 이미 세운다. 아래의 `on conflict do nothing` 이 그 행을 지난다.
-- ============================================================

-- 테넌트 셋. 고객사를 둘 두는 것은 행 단위 판정이 테넌트를 가르는지 보려는 것이다.
insert into org.tenant (id, kind, name)
overriding system value
values
    (1, 'operator', '운영팀'),
    (2, 'customer', '고객사 A'),
    (3, 'customer', '고객사 B')
on conflict (id) do nothing;

-- 계정. 역할마다 한 사람이다.
--
-- ⚠ **new(5)에는 `auth.users` 행이 없다.** 운영이 먼저 세워 두고 그 사람이 아직 로그인하지 않은 모양이고,
--    첫 로그인에 주소로 찾아 잇는 길(INV-ACCESS-08)을 계약 테스트가 잰다.
-- ⚠ **gone(6)은 나간 사람이다.** 로그인은 되고 어느 앱도 지나지 못한다(INV-ACCESS-03).
-- ⚠ **leaver(8)는 팀에서 내보내지는 사람이다.** e2e(`team.spec.ts`)가 고객사 A 에서 내보냈다가 다시 초대한다.
insert into org.account (id, email, name, deactivated_at)
overriding system value
values
    (1, 'ops@example.test',  '운영 소유주', null),
    (2, 'kim@example.test',  '김고객',     null),
    (3, 'lee@example.test',  '이고객',     null),
    (4, 'park@example.test', '박고객',     null),
    (5, 'new@example.test',  '새사람',     null),
    (6, 'gone@example.test', '나간사람',   now() - interval '30 days'),
    (7, 'both@example.test', '겸직',       null),
    (8, 'leaver@example.test', '내보낼사람', null)
on conflict (id) do nothing;

-- 멤버십. 어느 테넌트에서 무엇인지가 앱의 문과 운영 도구의 자격을 함께 정한다.
--
-- ⚠ **ops(1)는 운영 테넌트의 소유주다**(INV-ACCESS-05). 테넌트마다 소유주는 하나다.
-- ⚠ **both(7)는 겸직이다.** 운영팀의 구성원이면서 고객사 A 의 구성원이다. 멤버십이 둘이어야 「겸직 계정이
--    앱에 따라 다른 테넌트로 선다」(INV-ACCESS-02)를 잴 수 있다.
insert into org.membership (id, account_id, tenant_id, role)
overriding system value
values
    (1, 1, 1, 'owner'),
    (2, 2, 2, 'member'),
    (3, 3, 2, 'owner'),
    (4, 4, 3, 'owner'),
    (5, 5, 2, 'member'),
    (6, 6, 2, 'member'),
    (7, 7, 1, 'member'),
    (8, 7, 2, 'member'),
    (9, 8, 2, 'member')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('org.tenant',     'id'), 1000, true);
select setval(pg_get_serial_sequence('org.account',    'id'), 1000, true);
select setval(pg_get_serial_sequence('org.membership', 'id'), 1000, true);

-- 세션에서 행위자를 세우려면 `org.account.auth_user_id` 가 `auth.users` 를 가리켜야 한다.
-- ⚠ **outsider 는 `org.account` 에 행이 없다.** 로그인은 되고 `/no-access` 로 간다.
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at)
values
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ops@example.test',      now(), now()),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kim@example.test',      now(), now()),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lee@example.test',      now(), now()),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'park@example.test',     now(), now()),
    ('00000000-0000-4000-8000-0000000000e6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gone@example.test',     now(), now()),
    ('00000000-0000-4000-8000-0000000000e7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'both@example.test',     now(), now()),
    ('00000000-0000-4000-8000-0000000000e8', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leaver@example.test',   now(), now()),
    ('00000000-0000-4000-8000-0000000000e9', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.test', now(), now())
on conflict (id) do nothing;

-- 로컬 계정으로 로그인할 수 있게 비밀번호와 확인 시각을 넣는다. 모두 `hathway-local` 이다.
--
-- ⚠ 확인 시각(`email_confirmed_at`)이 비어 있으면 Auth 가 로그인을 거절한다.
-- ⚠ **토큰 칸을 남김없이 빈 문자열로 채운다.** GoTrue 는 그 칸이 null 인 행을 만나면 「Database error
--    loading user」 로 죽는다.
update auth.users
   set encrypted_password         = extensions.crypt('hathway-local', extensions.gen_salt('bf')),
       email_confirmed_at         = now(),
       confirmation_token         = '',
       recovery_token             = '',
       email_change_token_new     = '',
       email_change_token_current = '',
       email_change               = '',
       phone_change               = '',
       phone_change_token         = '',
       reauthentication_token     = '',
       raw_app_meta_data          = '{"provider":"email","providers":["email"]}'::jsonb,
       raw_user_meta_data         = '{}'::jsonb,
       is_sso_user                = false,
       is_anonymous               = false
 where id::text like '00000000-0000-4000-8000-0000000000e%';

-- `auth.identities` 가 없으면 비밀번호 로그인이 「identity not found」 로 거절된다
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from auth.users u
 where u.id::text like '00000000-0000-4000-8000-0000000000e%'
   and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');

update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e1' where id = 1;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e2' where id = 2;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e3' where id = 3;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e4' where id = 4;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e6' where id = 6;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e7' where id = 7;
update org.account set auth_user_id = '00000000-0000-4000-8000-0000000000e8' where id = 8;


-- ============================================================
-- 앱의 롤을 로컬에서만 **접속 가능**하게 만든다
--
-- 마이그레이션은 이름과 GRANT 만 만든다. 붙는 데 필요한 LOGIN · BYPASSRLS · 비밀번호는 여기서 넣는다.
--
-- ⚠ **계약 테스트도 앱의 롤로 붙는다.** 소유자 롤로 돌리면 권한이 모자라도 통과해서 「로컬은 되는데
--    배포하면 권한 부족」을 못 잡는다.
-- ============================================================

alter role web_app login password 'postgres';
alter role web_app bypassrls;
