-- agent: 에이전트와 나눈 대화의 장부.
--
-- 대화 자체(모델이 읽는 맥락과 스트림)는 Workflow 가 들고, 이 스키마는 사람이 다시 열어 볼 기록을 맡는다.
-- 워크플로의 스트림은 모델의 출력만 담고 훅으로 들어온 사람의 말은 담지 않기 때문이다.
--
-- ⚠ **대화의 id 는 워크플로의 실행 번호(text)다.** 밖에서 정한 id 라 그 값의 타입을 따른다.
-- ⚠ **말은 쌓이기만 한다**(INV-AGENT-02). 앱의 롤에 UPDATE · DELETE 를 주지 않고 트리거가 한 번 더 막는다.
-- ⚠ **같은 말은 한 줄이다**(INV-AGENT-03). 워크플로의 스텝은 실패하면 다시 돌고, 다시 돈 스텝이 같은 key 를
--    들고 온다. 유일 제약이 그 줄을 하나로 지킨다.

create schema agent;

comment on schema agent is '에이전트와 나눈 대화의 장부';

create table agent.conversation (
    id         text primary key,
    tenant_id  bigint      not null references org.tenant (id) on delete restrict,
    started_by bigint      not null references org.account (id) on delete restrict,
    title      text        not null,
    status     text        not null default 'open',
    started_at timestamptz not null default now(),
    closed_at  timestamptz,
    constraint conversation_status_check check (status in ('open', 'closed')),
    constraint conversation_closed_at check ((status = 'closed') = (closed_at is not null))
);

comment on table agent.conversation is '대화 하나. 실행 하나가 대화 하나다. 연 사람만 다시 연다(INV-AGENT-01)';

-- 목록은 그 사람이 연 대화를 최근 것부터 읽는다
create index conversation_started_by_idx on agent.conversation (started_by, started_at desc);
create index conversation_tenant_id_idx on agent.conversation (tenant_id);

create table agent.message (
    id              bigint generated always as identity primary key,
    conversation_id text        not null references agent.conversation (id) on delete restrict,
    key             text        not null,
    role            text        not null,
    text            text        not null,
    created_at      timestamptz not null default now(),
    constraint message_role_check check (role in ('user', 'assistant')),
    constraint message_key_not_blank check (btrim(key) <> ''),
    constraint message_conversation_key unique (conversation_id, key)
);

comment on table agent.message is '대화의 말. 쌓이기만 한다(INV-AGENT-02)';
comment on column agent.message.key is '대화 안에서 이 말을 가리키는 이름. 다시 돈 스텝이 같은 이름을 들고 온다(INV-AGENT-03)';

create function agent.message_is_append_only() returns trigger
    language plpgsql
    set search_path = ''
as $$
begin
    raise exception 'INV-AGENT-02 대화의 말은 고치거나 지우지 않는다 (message %)', old.id
        using errcode = 'check_violation';
end;
$$;

create trigger message_is_append_only
    before update or delete on agent.message
    for each row execute function agent.message_is_append_only();

alter table agent.conversation enable row level security;
alter table agent.message enable row level security;

create policy deny_all on agent.conversation as permissive for all to public using (false) with check (false);
create policy deny_all on agent.message as permissive for all to public using (false) with check (false);

grant usage on schema agent to service_role;
grant all on all tables in schema agent to service_role;
grant all on all sequences in schema agent to service_role;
grant execute on function agent.message_is_append_only() to service_role;

grant usage on schema agent to agent_app;
grant select, insert on agent.conversation to agent_app;
grant update (status, closed_at) on agent.conversation to agent_app;
grant select, insert on agent.message to agent_app;
