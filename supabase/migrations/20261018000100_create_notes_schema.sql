-- notes: 예시 도메인의 쪽지. 도메인 스키마가 어떤 모양인지 보이려고 세운 것이다.
--
-- 새 제품에서는 이 파일을 지우지 않고(이미 적용된 판은 고치지 않는다) 새 마이그레이션으로 스키마를 걷거나
-- 이름을 바꾼다. 아직 어디에도 적용하지 않은 새 저장소라면 이 파일을 통째로 바꿔도 된다.
--
-- ⚠ **행 단위 판정은 여기 없다.** 누가 어느 쪽지를 보는지는 `packages/notes/src/rules/visibility.ts` 의
--    `canSeeNote` 하나가 정하고, 어댑터의 질의가 같은 조건을 SQL 로 적는다. 둘이 같은 집합을 내는지는
--    계약 테스트가 잰다. 모든 요청이 앱마다 하나인 롤로 나가므로 DB 는 이 질의가 누구의 것인지 모른다.
-- ⚠ **스키마 이름은 업무 영역이다.** 앱 이름(web)으로 짓지 않는다. 둘째 앱(agent)이 이 표를 읽는 날 이름이
--    사실과 어긋나기 때문이다.

create schema notes;

comment on schema notes is '예시 도메인: 테넌트 안에서 나누는 쪽지';

create table notes.note (
    id          bigint generated always as identity primary key,
    tenant_id   bigint      not null references org.tenant (id) on delete restrict,
    author_id   bigint      not null references org.account (id) on delete restrict,
    title       text        not null,
    body        text        not null default '',
    visibility  text        not null default 'tenant',
    status      text        not null default 'active',
    version     integer     not null default 1,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint note_title_not_blank check (btrim(title) <> ''),
    constraint note_visibility_check check (visibility in ('private', 'tenant')),
    constraint note_status_check check (status in ('active', 'archived')),
    constraint note_version_positive check (version > 0)
);

comment on table notes.note is '쪽지. 같은 테넌트에만 보이고 비공개는 쓴 사람에게만 보인다(INV-NOTE-01)';
comment on column notes.note.version is '고칠 때마다 하나씩 는다. 쓰기가 열었을 때의 판과 대조한다(INV-NOTE-03)';

-- 행 단위 판정의 질의가 붙는 칸이다. 테넌트로 먼저 좁히고 최근 것부터 읽는다
create index note_tenant_id_idx on notes.note (tenant_id, id desc);
create index note_author_id_idx on notes.note (author_id);

-- INV-NOTE-04 보관은 한 방향이다. 규칙이 아니라 기록의 성질이라 트리거로 둔다.
-- 되살릴 일이면 새로 쓴다
create function notes.note_archive_is_one_way() returns trigger
    language plpgsql
    set search_path = ''
as $$
begin
    if old.status = 'archived' then
        raise exception 'INV-NOTE-04 보관한 쪽지는 바꾸지 않는다 (note %)', old.id
            using errcode = 'check_violation';
    end if;

    return new;
end;
$$;

create trigger note_archive_is_one_way
    before update on notes.note
    for each row execute function notes.note_archive_is_one_way();

alter table notes.note enable row level security;

create policy deny_all on notes.note as permissive for all to public using (false) with check (false);

grant usage on schema notes to service_role;
grant all on all tables in schema notes to service_role;
grant all on all sequences in schema notes to service_role;
grant execute on function notes.note_archive_is_one_way() to service_role;

-- web 은 쪽지를 쓰고 보관한다. 지우는 길은 없다
grant usage on schema notes to web_app;
grant select, insert on notes.note to web_app;
grant update (status, version, updated_at) on notes.note to web_app;

-- agent 는 에이전트의 도구가 읽기만 한다. 도구도 같은 술어를 지난다
grant usage on schema notes to agent_app;
grant select (id, tenant_id, author_id, title, body, visibility, status, version, created_at) on notes.note to agent_app;
