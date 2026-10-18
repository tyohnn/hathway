-- org: 테넌트 · 계정 · 멤버십. 앱의 문이 여기서 열린다. 스캐폴드의 같은 스키마를 그대로 옮겼다.
--
-- 판정은 여기 없다. 이 앱을 쓸 수 있는 사람인지는 `packages/access` 의 `canEnterApp` 이 이 표들의 사실을
-- 받아 답한다(INV-ACCESS-01). DB 에 절차로 업무 규칙을 두지 않는다.
--
-- ⚠ **HTTP 로 들어오는 경로를 두지 않는다.** `config.toml` 의 `[api] schemas` 에 없고, anon · authenticated 에는
--    스키마 USAGE 를 주지 않는다. 표마다 RLS 를 켜고 deny_all 정책을 둔다. 앱의 롤은 bypassrls 라서 정책이
--    막는 것은 없지만, 나중에 GRANT 한 줄이 잘못 더해질 때 데이터가 열리는 대신 0행이 나온다.
-- ⚠ **앱의 롤에는 컬럼 단위로 SELECT 만 준다.** bypassrls 라 GRANT 가 유일한 경계다. 예외는 처음 로그인한
--    사람이 자기 계정과 세션을 잇는 `org.account.auth_user_id` 의 UPDATE 하나다(INV-ACCESS-08).
-- ⚠ 팀을 관리하는 화면이 아직 없어서 계정과 멤버십의 쓰기는 열지 않는다. 사람을 들이는 일은 지금 소유자 롤로 한다.

create schema org;

comment on schema org is '테넌시: 테넌트와 계정과 멤버십. 앱의 문이 여기서 열린다';

create table org.tenant (
    id         bigint generated always as identity primary key,
    kind       text        not null,
    name       text        not null,
    active     boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- ⚠ `packages/shared/src/constants/tenancy.ts` 의 TENANT_KINDS 와 같아야 한다
    constraint tenant_kind_check check (kind in ('operator', 'customer')),
    constraint tenant_name_not_blank check (btrim(name) <> '')
);

comment on table org.tenant is '테넌트. 이 제품을 쓰는 조직 단위이며 종류가 앱의 문을 연다';
comment on column org.tenant.kind is 'operator(운영팀) · customer(고객 조직). 코드의 TENANT_KINDS 와 짝이다';

create table org.account (
    id             bigint generated always as identity primary key,
    auth_user_id   uuid unique,
    email          text        not null,
    name           text,
    deactivated_at timestamptz,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

comment on table org.account is '로그인 주체. 사람 하나에 행 하나이고 소속은 org.membership 이 갖는다';
comment on column org.account.auth_user_id is 'auth.users.id. FK 는 걸지 않고 unique 만 둔다. 첫 로그인이 한 번 채운다';
comment on column org.account.deactivated_at is '나간 사람. 어느 테넌트로도 들어오지 못한다(INV-ACCESS-03)';

-- 이메일로 명부를 뒤지는 조회가 한 사람을 골라야 한다. 대문자만 다른 두 계정이 서지 못한다
create unique index account_email_lower_key on org.account (lower(email));

create table org.membership (
    id         bigint generated always as identity primary key,
    account_id bigint      not null references org.account (id) on delete cascade,
    tenant_id  bigint      not null references org.tenant (id) on delete restrict,
    role       text        not null default 'member',
    active     boolean     not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint membership_role_check check (role in ('owner', 'admin', 'member')),
    constraint membership_account_tenant_key unique (account_id, tenant_id)
);

comment on table org.membership is '계정과 테넌트를 잇고 그 안의 역할을 정한다';
comment on column org.membership.role is 'owner · admin · member';

create index membership_account_id_idx on org.membership (account_id);
create index membership_tenant_id_idx on org.membership (tenant_id) where active;
-- 테넌트마다 소유주는 하나다
create unique index membership_owner_per_tenant on org.membership (tenant_id) where role = 'owner' and active;

alter table org.tenant enable row level security;
alter table org.account enable row level security;
alter table org.membership enable row level security;

create policy deny_all on org.tenant as permissive for all to public using (false) with check (false);
create policy deny_all on org.account as permissive for all to public using (false) with check (false);
create policy deny_all on org.membership as permissive for all to public using (false) with check (false);

grant usage on schema org to service_role;
grant all on all tables in schema org to service_role;
grant all on all sequences in schema org to service_role;

-- 앱이 쓰지 않는 칸은 열지 않는다
grant usage on schema org to web_app;
grant select (id, kind, name, active) on org.tenant to web_app;
grant select (id, email, name, deactivated_at) on org.account to web_app;
grant select (auth_user_id), update (auth_user_id) on org.account to web_app;
grant select (id, account_id, tenant_id, role, active) on org.membership to web_app;
