import { afterEach, describe, expect, it } from "vitest";

import { localAccountsAllowed } from "./localAccounts";

/**
 * 로컬 계정 문의 개폐 규칙.
 *
 * 여기서 지키는 것은 하나다: **배포에서는 아무것도 하지 않아도 닫혀 있는 것.** e2e 가 프로덕션 빌드를
 * 상대로 로그인하려고 문을 여는 스위치를 두었으므로(`ALLOW_LOCAL_ACCOUNTS`), 그 스위치가 없을 때 닫혀
 * 있다는 사실을 검사가 붙들지 않으면 기본값이 조용히 뒤집히는 날을 알 수 없다.
 *
 * ⚠ 화면과 서버 액션이 **같은 함수**를 읽으므로 이 검사가 두 자리를 함께 지킨다. 종전처럼 규칙이 두 벌이면
 *    한쪽만 고치는 날이 오고, 화면은 감추는데 액션은 받는 모양이 된다.
 */
const ENV = process.env;

afterEach(() =>
{
    process.env = ENV;
});

/** `NODE_ENV` 는 읽기 전용으로 선언되어 있어 객체를 통째로 갈아 끼운다 */
const withEnv = (values: Record<string, string | undefined>): void =>
{
    process.env = { ...ENV, ...values } as NodeJS.ProcessEnv;
};

describe("로컬 계정 문", () =>
{
    it("배포에서는 스위치가 없으면 닫혀 있다", () =>
    {
        withEnv({ NODE_ENV: "production", ALLOW_LOCAL_ACCOUNTS: undefined });

        expect(localAccountsAllowed()).toBe(false);
    });

    it("배포에서도 스위치가 켜져 있으면 열린다 — e2e 가 서는 자리다", () =>
    {
        withEnv({ NODE_ENV: "production", ALLOW_LOCAL_ACCOUNTS: "1" });

        expect(localAccountsAllowed()).toBe(true);
    });

    it("스위치는 정확히 「1」 일 때만 걸린다", () =>
    {
        for (const value of ["true", "yes", "0", "", " 1"])
        {
            withEnv({ NODE_ENV: "production", ALLOW_LOCAL_ACCOUNTS: value });

            expect(localAccountsAllowed(), `ALLOW_LOCAL_ACCOUNTS=${JSON.stringify(value)}`).toBe(false);
        }
    });

    it("개발 환경은 스위치 없이도 열린다", () =>
    {
        withEnv({ NODE_ENV: "development", ALLOW_LOCAL_ACCOUNTS: undefined });

        expect(localAccountsAllowed()).toBe(true);
    });
});
