-- preferences: 사람이 제품을 쓰는 방식에 대해 고른 설정. 플러그인의 설정 화면이 읽고 쓴다.
--
-- 플러그인의 구조화 설정은 화면을 호스트(ChatGPT)가 그리고 값은 서버가 보관한다. 메모리에 두면 서버리스 인스턴스마다
-- 흩어져 방금 바꾼 값이 다음에 열면 사라지므로 표로 세운다.
--
-- ⚠ **누구의 설정인지는 여기서 정하지 않는다.** 어댑터의 질의가 행위자의 계정과 테넌트로만 줄을 찾는다
--    (INV-PREFERENCE-01). 모든 요청이 앱마다 하나인 롤로 나가므로 DB 는 이 질의가 누구의 것인지 모른다.
-- ⚠ **칸에 기본값을 두지 않는다.** 고른 적 없는 사람의 값은 `packages/preferences` 의 `DEFAULT_PREFERENCES` 하나가
--    정하고 어댑터가 그 값을 넘긴다. 여기에도 두면 기본값이 두 곳에 산다.
-- ⚠ **agent_app 에는 주지 않는다.** 설정을 읽는 것은 web 의 MCP 뿐이다.

create schema preferences;

comment on schema preferences is '사람이 조직 안에서 고른 설정';

create table preferences.member_preference (
    account_id         bigint      not null,
    tenant_id          bigint      not null,
    default_visibility text        not null,
    show_archived      boolean     not null,
    updated_at         timestamptz not null default now(),
    -- INV-PREFERENCE-03 한 사람이 한 조직에서 갖는 설정은 한 줄이다
    constraint member_preference_pkey primary key (account_id, tenant_id),
    -- 설정은 그 조직에 속한 사람의 것이다. 열쇠가 멤버십의 유일 열쇠와 같은 차례라 이 FK 의 인덱스를 겸한다
    constraint member_preference_membership_fkey foreign key (account_id, tenant_id)
        references org.membership (account_id, tenant_id) on delete cascade,
    -- ⚠ `packages/preferences/src/rules/update.ts` 의 VISIBILITY_VALUES 와 같아야 한다(INV-PREFERENCE-02)
    constraint member_preference_visibility_check check (default_visibility in ('private', 'tenant'))
);

comment on table preferences.member_preference is '사람마다 조직마다 한 줄. 자기 것만 읽고 쓴다(INV-PREFERENCE-01)';
comment on column preferences.member_preference.default_visibility is '공개 범위를 말하지 않고 쓰는 새 쪽지가 따르는 값';
comment on column preferences.member_preference.show_archived is '보관한 쪽지도 목록에 싣는가';

alter table preferences.member_preference enable row level security;

create policy deny_all on preferences.member_preference as permissive for all to public using (false) with check (false);

grant usage on schema preferences to service_role;
grant all on all tables in schema preferences to service_role;

-- web 은 설정을 읽고 고친다. 지우는 길과 열쇠를 바꾸는 길은 없다
grant usage on schema preferences to web_app;
grant select, insert on preferences.member_preference to web_app;
grant update (default_visibility, show_archived, updated_at) on preferences.member_preference to web_app;
