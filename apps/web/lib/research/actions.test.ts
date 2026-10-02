import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RESEARCH_BOARDS } from "./catalog";

// 경계만 바꿔 읽는다: PostgREST 클라이언트와 Next 의 캐시.
const db = vi.hoisted(() =>
{
    const state = { error: null as Error | null, upserted: [] as unknown[], deleted: [] as string[] };
    const from = vi.fn(() => ({
        upsert: (row: unknown) =>
        {
            state.upserted.push(row);
            return {
                select: () => ({
                    single: async () => ({ data: state.error ? null : row, error: state.error }),
                }),
            };
        },
        delete: () => ({
            eq: async (_column: string, slug: string) =>
            {
                state.deleted.push(slug);
                return { error: state.error };
            },
        }),
    }));
    return { state, from };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: db.from }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
    createResearchBoardAction,
    deleteResearchBoardAction,
    saveResearchBoardAction,
} from "./actions";

const seed = RESEARCH_BOARDS[0];

beforeEach(() =>
{
    db.state.error = null;
    db.state.upserted = [];
    db.state.deleted = [];
    db.from.mockClear();
    vi.stubEnv("VERCEL_ENV", "preview");
});

afterEach(() =>
{
    vi.unstubAllEnvs();
});

describe("리서치 보드 서버 액션", () =>
{
    it("프로덕션에서는 만들기도 저장도 지우기도 DB 에 닿지 않는다. 관문이 액션의 맨 앞에 선다", async () =>
    {
        vi.stubEnv("VERCEL_ENV", "production");
        expect((await createResearchBoardAction("stocks")).ok).toBe(false);
        expect((await saveResearchBoardAction(seed)).ok).toBe(false);
        expect((await deleteResearchBoardAction(seed.slug, "stocks")).ok).toBe(false);
        expect(db.from).not.toHaveBeenCalled();
    });

    it("한도를 넘은 보드는 DB 에 닿지 않는다", async () =>
    {
        const result = await saveResearchBoardAction({ ...seed, title: "가".repeat(121) });
        expect(result).toEqual({ ok: false, error: "제목은 120자까지 쓸 수 있어요." });
        expect(db.from).not.toHaveBeenCalled();
    });

    it("통과한 보드는 파싱한 값으로 저장한다. 타입에 없는 키가 DB 로 가지 않는다", async () =>
    {
        const result = await saveResearchBoardAction({ ...seed, id: "x", created_at: "x" } as typeof seed);
        expect(result.ok).toBe(true);
        expect(db.state.upserted).toHaveLength(1);
        expect(Object.keys(db.state.upserted[0] as object).sort()).toEqual(
            ["document", "related_industry_slug", "related_stock_code", "slug", "tagline", "theme", "title"],
        );
    });

    it("slug 꼴이 아닌 값으로는 지우지 않는다", async () =>
    {
        expect((await deleteResearchBoardAction("a,b", "stocks")).ok).toBe(false);
        expect(db.state.deleted).toEqual([]);
        expect((await deleteResearchBoardAction(seed.slug, "stocks")).ok).toBe(true);
        expect(db.state.deleted).toEqual([seed.slug]);
    });

    it("DB 오류의 원문은 돌려주지 않는다. 테이블과 제약의 이름이 밖으로 나간다", async () =>
    {
        vi.spyOn(console, "error").mockImplementation(() => {});
        db.state.error = new Error('violates check constraint "research_boards_theme_check"');
        const result = await saveResearchBoardAction(seed);
        expect(result.ok).toBe(false);
        expect(JSON.stringify(result)).not.toContain("research_boards");
    });
});
