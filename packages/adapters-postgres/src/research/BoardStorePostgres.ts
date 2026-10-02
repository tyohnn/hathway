import "server-only";

import { Effect, Exit, Layer, Schema } from "effect";

import { BoardDocument, type Board, type Group } from "@investment/research/domain/Board";
import { BoardStore, BoardStoreError, type RemoveOutcome, type SaveOutcome } from "@investment/research/ports/BoardStore";

import type { SqlExecutor } from "../connection.ts";

/**
 * 보드 저장소의 Postgres 구현. `pg` 로 직결하고 접속 롤은 `web_app` 이다.
 *
 * ⚠ **쓰는 문장이 테넌트와 판을 조건으로 건다.** 판정(`editVerdict` · `removeVerdict`)이 먼저 지나지만 판정과
 *    쓰기 사이에 다른 요청이 끼어들 수 있다. 조건이 맞지 않으면 0행이고 `conflict` · `missing` 으로 답한다.
 * ⚠ **값은 `$n` 으로만 넘긴다.** 템플릿의 `${}` 는 모듈 상수(열 목록)뿐이다.
 * ⚠ **읽을 때 문서의 모양을 다시 본다.** 이 구현을 지나지 않고 들어온 행(옛 저장 · 손으로 고친 행)이 있을 수 있다.
 *    모양이 틀리면 화면이 통째로 깨지는 대신 그 보드가 빈 그룹으로 읽힌다.
 */
type BoardRow =
{
    slug: string;
    tenant_id: string;
    created_by: string | null;
    theme: "stocks" | "real-estate";
    title: string;
    tagline: string;
    related_stock_code: string | null;
    related_industry_slug: string | null;
    document: unknown;
    version: number;
};

const COLUMNS = "slug, tenant_id, created_by, theme, title, tagline, related_stock_code, related_industry_slug, document, version";

const LIST = `select ${COLUMNS} from public.research_boards where theme = $1 order by updated_at desc, id desc`;

const FIND = `select ${COLUMNS} from public.research_boards where slug = $1`;

const INSERT = `
    insert into public.research_boards
        (slug, tenant_id, created_by, theme, title, tagline, related_stock_code, related_industry_slug, document)
    values ($1, $2::bigint, $3::bigint, $4, $5, $6, $7, $8, $9::jsonb)
    returning ${COLUMNS}
`;

const SAVE = `
    update public.research_boards
       set title = $4, tagline = $5, document = $6::jsonb, version = version + 1
     where slug = $1
       and tenant_id = $2::bigint
       and version = $3
    returning ${COLUMNS}
`;

const REMOVE = "delete from public.research_boards where slug = $1 and tenant_id = $2::bigint";

const decodeDocument = Schema.decodeUnknownExit(BoardDocument);

const groupsOf = (document: unknown): ReadonlyArray<Group> =>
{
    const decoded = decodeDocument(document);

    return Exit.isSuccess(decoded) ? decoded.value.groups : [];
};

const boardOf = (row: BoardRow): Board => ({
    slug: row.slug,
    tenantId: row.tenant_id,
    createdBy: row.created_by,
    theme: row.theme,
    title: row.title,
    tagline: row.tagline,
    ...(row.related_stock_code === null ? {} : { relatedStockCode: row.related_stock_code }),
    ...(row.related_industry_slug === null ? {} : { relatedIndustrySlug: row.related_industry_slug }),
    groups: groupsOf(row.document),
    version: row.version,
});

const failure = (operation: string) =>
    (cause: unknown): BoardStoreError => new BoardStoreError({ message: `보드 ${operation} 실패: ${String(cause)}` });

const isId = (value: string): boolean => /^\d+$/.test(value);

export const boardStorePostgresLayer = (sql: SqlExecutor): Layer.Layer<BoardStore> =>
    Layer.succeed(BoardStore, BoardStore.of({
        listByTheme: (theme) =>
            Effect.tryPromise({
                try: () => sql.query<BoardRow>(LIST, [theme]),
                catch: failure("목록"),
            }).pipe(Effect.map((result) => result.rows.map(boardOf))),

        findBySlug: (slug) =>
            Effect.tryPromise({
                try: () => sql.query<BoardRow>(FIND, [slug]),
                catch: failure("찾기"),
            }).pipe(Effect.map((result) =>
            {
                const row = result.rows[0];

                return row === undefined ? null : boardOf(row);
            })),

        create: (board) =>
            Effect.tryPromise({
                try: () => sql.query<BoardRow>(INSERT, [
                    board.slug,
                    board.tenantId,
                    board.createdBy,
                    board.theme,
                    board.title,
                    board.tagline,
                    board.relatedStockCode ?? null,
                    board.relatedIndustrySlug ?? null,
                    JSON.stringify({ groups: board.groups }),
                ]),
                catch: failure("쓰기"),
            }).pipe(Effect.flatMap((result) =>
            {
                const row = result.rows[0];

                return row === undefined
                    ? Effect.fail(new BoardStoreError({ message: "보드 쓰기가 행을 돌려주지 않았다" }))
                    : Effect.succeed(boardOf(row));
            })),

        save: ({ slug, tenantId, expectedVersion, change }) =>
            !isId(tenantId)
                ? Effect.succeed<SaveOutcome>({ _tag: "conflict" })
                : Effect.tryPromise({
                    try: () => sql.query<BoardRow>(SAVE, [
                        slug,
                        tenantId,
                        expectedVersion,
                        change.title,
                        change.tagline,
                        JSON.stringify({ groups: change.groups }),
                    ]),
                    catch: failure("저장"),
                }).pipe(Effect.map((result): SaveOutcome =>
                {
                    const row = result.rows[0];

                    return row === undefined ? { _tag: "conflict" } : { _tag: "saved", board: boardOf(row) };
                })),

        remove: ({ slug, tenantId }) =>
            !isId(tenantId)
                ? Effect.succeed<RemoveOutcome>("missing")
                : Effect.tryPromise({
                    try: () => sql.query(REMOVE, [slug, tenantId]),
                    catch: failure("지우기"),
                }).pipe(Effect.map((result): RemoveOutcome => (result.rowCount === 1 ? "removed" : "missing"))),
    }));
