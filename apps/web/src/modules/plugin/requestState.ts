import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 폼을 되물을 때 클라이언트에 맡겼다가 돌려받는 상태(`requestState`). 서명해서 내고 대조해서 받는다.
 *
 * 이 라우트는 요청 사이에 아무것도 기억하지 않는다. 그래서 「이 폼은 우리가 이 사람에게 이 도구로 방금 낸 것」이라는
 * 사실을 클라이언트가 들고 있게 하고, 답과 함께 돌아올 때 확인한다. 확인하지 않으면 폼을 받은 적 없는 요청이
 * 답만 지어 보내 도구의 뒷부분을 곧바로 돌린다.
 *
 * ⚠ **`requestState` 는 밖에서 온 입력이다.** 클라이언트를 지나오므로 고쳤을 수 있다. 서명이 맞지 않으면 버린다.
 * ⚠ **누구에게 낸 것인지를 함께 서명한다.** 조직과 계정이 다르면 받지 않는다. 한 계정이 두 조직에 속할 수 있어
 *    계정만으로는 모자란다.
 * ⚠ **한 번만 쓰이게 막지는 않는다.** 기한 안에는 같은 상태로 다시 부를 수 있다. 두 번 쓰이면 안 되는 일(결제 등)을
 *    폼 뒤에 둘 때는 쓴 상태를 서버가 적어 두어야 한다.
 * ⚠ **시각은 인자로 받는다.** 검사가 기한의 양쪽 끝을 재려면 시계를 스스로 읽지 않아야 한다.
 */
export const FORM_TTL_MS = 10 * 60 * 1000;

export interface StateClaims
{
    /** 누구에게 낸 것인가. `<테넌트>:<계정>` 이다 */
    readonly sub: string;
    /** 어느 도구가 낸 것인가 */
    readonly tool: string;
    /** 이 시각(밀리초)까지 받는다 */
    readonly exp: number;
}

export type StateVerdict = "ok" | "tampered" | "mismatch" | "expired";

const signatureOf = (secret: string, payload: string): Buffer => createHmac("sha256", secret).update(payload).digest();

export const signState = (secret: string, claims: StateClaims): string =>
{
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");

    return `${payload}.${signatureOf(secret, payload).toString("base64url")}`;
};

const claimsOf = (payload: string): StateClaims | null =>
{
    try
    {
        const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

        if (typeof parsed !== "object" || parsed === null)
        {
            return null;
        }

        const { sub, tool, exp } = parsed as Record<string, unknown>;

        return typeof sub === "string" && typeof tool === "string" && typeof exp === "number" ? { sub, tool, exp } : null;
    }
    catch
    {
        return null;
    }
};

export const verifyState = (
    secret: string,
    state: string,
    expected: { readonly sub: string; readonly tool: string; readonly now: number },
): StateVerdict =>
{
    const [payload = "", signature = "", ...rest] = state.split(".");
    const given = Buffer.from(signature, "base64url");
    const wanted = signatureOf(secret, payload);

    // 서명을 먼저 본다. 맞지 않는 것의 속을 읽어 까닭을 가르지 않는다
    if (rest.length > 0 || given.length !== wanted.length || !timingSafeEqual(given, wanted))
    {
        return "tampered";
    }

    const claims = claimsOf(payload);

    if (claims === null)
    {
        return "tampered";
    }

    if (claims.sub !== expected.sub || claims.tool !== expected.tool)
    {
        return "mismatch";
    }

    return expected.now > claims.exp ? "expired" : "ok";
};
