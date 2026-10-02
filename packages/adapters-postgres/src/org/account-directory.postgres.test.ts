import { afterAll, assert, describe, it } from "vitest";
import { Effect } from "effect";
import { Pool } from "pg";

import { accountDirectoryContract } from "@investment/access/testing/contracts/account-directory";

import { closePostgresPools, poolExecutor, postgresPool } from "../connection.ts";
import { localDb } from "../testing/local-db.ts";

import { accountDirectoryPostgresLayer } from "./AccountDirectoryPostgres.ts";

/**
 * 계정 명부의 Postgres 계약. 첫 로그인에 세션을 잇는 쓰기다(INV-ACCESS-08).
 *
 * ⚠ **앱의 롤마다 붙어 잰다.** 같은 어댑터를 앱마다 부르는데 GRANT 는 롤마다 따로다. 앱이 늘면 아래
 *    목록에 줄이 늘고, 빠뜨리면 그 롤의 GRANT 누락이 「로그인은 되는데 전원 `/no-access`」로 배포에서 드러난다.
 * ⚠ **계정을 심는 일만 소유자로 붙는다.** 계정은 운영이 먼저 만드는 행이라 앱의 롤에 INSERT 가 없다.
 */
const owner = new Pool({ connectionString: process.env["OWNER_DATABASE_URL"] as string });

afterAll(async () =>
{
    await owner.end();
    await closePostgresPools();
});

const ROLES = [
    { app: "web", env: "WEB_DATABASE_URL" },
] as const;

for (const { app, env } of ROLES)
{
    const db = localDb(env);

    if (!db.ok)
    {
        describe(`계정 명부 (${app})`, () =>
        {
            throw new Error(db.reason);
        });

        continue;
    }

    const sql = poolExecutor(postgresPool(db.url));

    accountDirectoryContract(`postgres · ${app}_app`, (seeds) =>
        Effect.promise(async () =>
        {
            const accountIds: Array<string> = [];

            for (const seed of seeds)
            {
                const inserted = await owner.query<{ id: string }>(
                    `insert into org.account (email, name, auth_user_id, deactivated_at)
                     values ($1, '잇기 검사', $2::uuid, case when $3 then now() end)
                     returning id`,
                    [seed.email, seed.authUserId, seed.deactivated ?? false],
                );

                accountIds.push(String(inserted.rows[0]?.id));
            }

            return { layer: accountDirectoryPostgresLayer(sql), accountIds };
        }));
}

describe("잇는 쓰기의 권한 (Postgres)", () =>
{
    for (const { app, env } of ROLES)
    {
        // web 은 팀 관리가 이름을 더 쓴다(`*_grant_team_writes.sql`). 주소와 나간 표시는 어느 앱도 쓰지 못한다
        const columns = app === "web" ? ["email = email", "deactivated_at = null"] : ["email = email", "deactivated_at = null", "name = name"];

        it(`${app}_app 은 org.account 의 주소와 나간 표시를 쓰지 못한다 — 남의 계정을 살리거나 주소를 바꾸지 못한다`, async () =>
        {
            const db = localDb(env);

            assert.isTrue(db.ok);

            const role = new Pool({ connectionString: db.ok ? db.url : "" });
            const refusals = await Promise.all(
                columns.map((assignment) =>
                    role.query(`update org.account set ${assignment} where false`).then(
                        () => "허용됨",
                        (cause: unknown) => String(cause),
                    )),
            );

            await role.end();

            for (const refusal of refusals)
            {
                assert.include(refusal, "permission denied");
            }
        });
    }
});
