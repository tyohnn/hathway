-- 리서치 보드가 테넌트에 속한다. 고치고 지우는 판정이 이 칸을 본다(INV-RESEARCH-02).
--
-- 지금까지 보드에는 주인이 없었고, web 이 service_role 로 누구의 요청이든 쓰고 지웠다. 이 파일부터 쓰는 길은
-- 로그인한 사람의 테넌트를 조건으로 건다. 읽기는 그대로 공개다(INV-RESEARCH-01).
--
-- ⚠ **이미 있는 보드는 운영팀의 것이 된다.** 주인이 없던 보드를 누군가의 것으로 정해야 NOT NULL 을 걸 수 있다.
--    운영 테넌트가 없으면 여기서 세운다. 로컬 시드(`seeds/org.sql`)의 운영팀(id 1)과 같은 행이다.
-- ⚠ **판(`version`)은 문장이 올린다.** 저장하는 문장이 `where version = $n` 을 걸고 `version + 1` 을 적는다.
--    트리거로 올리지 않는다. 규칙을 DB 의 절차에 두지 않는다.
-- ⚠ **표는 `public` 에 그대로 둔다.** 새 도메인은 새 스키마로 세우는 것이 규약이지만 이 표는 먼저 있었고,
--    옮기면 배포 순서에 따라 읽기까지 끊긴다. 읽기를 `pg` 로 옮기는 단계에서 함께 옮긴다.

insert into org.tenant (kind, name)
select 'operator', '운영팀'
 where not exists (select 1 from org.tenant where kind = 'operator');

alter table public.research_boards
    add column tenant_id  bigint references org.tenant (id) on delete restrict,
    add column created_by bigint references org.account (id) on delete set null,
    add column version    integer not null default 1;

update public.research_boards
   set tenant_id = (select id from org.tenant where kind = 'operator' order by id limit 1)
 where tenant_id is null;

alter table public.research_boards
    alter column tenant_id set not null;

create index research_boards_tenant_id_idx on public.research_boards (tenant_id);
create index research_boards_created_by_idx on public.research_boards (created_by);

comment on column public.research_boards.tenant_id is '이 보드를 가진 테넌트. 그 구성원만 고치고 지운다(INV-RESEARCH-02)';
comment on column public.research_boards.created_by is '만든 사람. 이 칸을 들이기 전의 보드와 나간 사람의 보드는 비어 있다';
comment on column public.research_boards.version is '고칠 때마다 하나씩 는다. 저장이 열었을 때의 판을 조건으로 건다(INV-RESEARCH-03)';

-- RLS 는 이미 켜져 있고 정책이 없다. 다른 표와 같은 모양으로 deny_all 을 적어 둔다
create policy deny_all on public.research_boards as permissive for all to public using (false) with check (false);

-- ⚠ **컬럼 단위로 연다.** 앱의 롤은 bypassrls 라 GRANT 가 유일한 경계다. 만든 뒤에는 slug · 테마 · 테넌트 · 만든 사람을
--    바꾸지 못한다.
grant usage on schema public to web_app;
grant select on public.research_boards to web_app;
grant insert (slug, tenant_id, created_by, theme, title, tagline, related_stock_code, related_industry_slug, document)
    on public.research_boards to web_app;
grant update (title, tagline, document, version) on public.research_boards to web_app;
grant delete on public.research_boards to web_app;
