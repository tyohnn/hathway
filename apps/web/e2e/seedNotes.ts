import { Client } from "pg";

/**
 * 쪽 넘기기를 재는 스펙이 쪽지를 한꺼번에 심는다. 화면으로 스물한 개를 쓰면 스펙 하나가 몇십 초를 쓴다.
 *
 * ⚠ 제목에 그 스펙만의 표식을 단다. 스펙은 그 표식으로 찾아서 다른 스펙과 시드의 쪽지를 떼어 낸다.
 * ⚠ 로컬 스택의 관리자 접속이다(`freeCredits.ts` 와 같다). 앱의 롤로 심으면 판정을 지나지 않은 쓰기 길이 앱에 생긴다.
 */
const ADMIN_DATABASE_URL = process.env.E2E_ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54362/postgres";

export const seedNotes = async ({ tenantId, authorId, mark, count, visibility }: {
    readonly tenantId: number;
    readonly authorId: number;
    readonly mark: string;
    readonly count: number;
    readonly visibility: "private" | "tenant";
}): Promise<void> =>
{
    const client = new Client({ connectionString: ADMIN_DATABASE_URL });

    await client.connect();

    try
    {
        await client.query(
            `insert into notes.note (tenant_id, author_id, title, body, visibility)
             select $1, $2, $3 || ' ' || g, '', $5 from generate_series(1, $4::int) as g`,
            [tenantId, authorId, mark, count, visibility],
        );
    }
    finally
    {
        await client.end();
    }
};
