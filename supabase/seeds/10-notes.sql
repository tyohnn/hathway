-- ============================================================
-- 예시 도메인 `notes` 의 시드. e2e 가 화면에서 행 단위 판정을 눈으로 재는 데 쓴다.
--
-- ⚠ **판정의 네 갈래를 한 벌씩 심는다.** 김(2)의 눈으로 보면 셋이 보이고 둘이 보이지 않아야 한다.
--    e2e(`apps/web/e2e/notes.spec.ts`)가 제목으로 그것을 단언한다.
--
--      보인다      김이 쓴 비공개 · 김이 쓴 공개 · 이(3)가 쓴 공개
--      안 보인다   이가 쓴 비공개(INV-NOTE-01) · 고객사 B 의 공개(INV-NOTE-01)
--
-- ⚠ **e2e 가 고치는 쪽지를 여기 심지 않는다.** 보관처럼 상태를 바꾸는 스펙은 제 쪽지를 새로 만들어 쓴다.
--    시드의 쪽지를 고치면 두 번째 실행부터 같은 스펙이 다른 화면을 본다(시드 원칙 셋째).
-- ⚠ 시각은 **지금 기준의 상대값**이다. 고정 날짜를 심으면 정렬이 며칠 뒤부터 달라 보인다.
-- ============================================================

insert into notes.note (id, tenant_id, author_id, title, body, visibility, created_at, updated_at)
overriding system value
values
    (1, 2, 2, '김의 비공개 메모',     '나만 보는 메모다.',                 'private', now() - interval '3 days', now() - interval '3 days'),
    (2, 2, 2, '다음 주 회의 안건',    '1. 분기 목표 2. 채용',               'tenant',  now() - interval '2 days', now() - interval '2 days'),
    (3, 2, 3, '분기 목표 (공유)',     '고객사 A 전체가 보는 목표다.',        'tenant',  now() - interval '1 day',  now() - interval '1 day'),
    (4, 2, 3, '이의 비공개 초안',     '김에게 보이면 안 된다.',              'private', now() - interval '1 day',  now() - interval '1 day'),
    (5, 3, 4, '고객사 B 내부 메모',   '다른 고객사의 사람에게 보이면 안 된다.', 'tenant',  now() - interval '1 day',  now() - interval '1 day')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('notes.note', 'id'), 1000, true);

-- 운영팀의 쪽지 둘. agent 앱의 에이전트가 도구(`list_my_notes`)로 읽는다. 운영 소유주(1)의 눈으로는 공개 하나만
-- 보이고 겸직(7)의 비공개는 보이지 않아야 한다. agent 의 e2e 가 그것을 단언한다
insert into notes.note (id, tenant_id, author_id, title, body, visibility, created_at, updated_at)
overriding system value
values
    (6, 1, 1, '운영 주간 점검',     '고객사 문의를 훑는다.',       'tenant',  now() - interval '1 day', now() - interval '1 day'),
    (7, 1, 7, '겸직의 비공개 메모', '운영 소유주에게 보이면 안 된다.', 'private', now() - interval '1 day', now() - interval '1 day')
on conflict (id) do nothing;

select setval(pg_get_serial_sequence('notes.note', 'id'), 1000, true);
