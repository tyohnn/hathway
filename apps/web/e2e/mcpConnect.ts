import { createHash, randomBytes } from "node:crypto";

import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { signIn } from "./signIn";

/**
 * MCP 로그인 사슬(동적 등록 · PKCE · 동의 · 코드 교환)을 밟는 e2e 도구. 코어의 MCP 스펙과 모듈의 스펙이 함께 쓴다.
 */
export const AUTH = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54361"}/auth/v1`;
const REDIRECT = "http://127.0.0.1:4401/e2e-oauth-callback";

const base64url = (buffer: Buffer): string => buffer.toString("base64url");

/**
 * 한 사람으로 MCP 로그인 사슬(동적 등록 · PKCE · 동의 · 코드 교환)을 밟고, 그 토큰으로 JSON-RPC 를 부르는 함수를 돌려준다.
 */
export const connect = async (page: Page, request: APIRequestContext, email: string) =>
{
    const registered = await request.post(`${AUTH}/oauth/clients/register`, {
        data: {
            client_name: "e2e MCP 클라이언트",
            redirect_uris: [REDIRECT],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
        },
    });

    expect(registered.ok(), await registered.text()).toBe(true);

    const { client_id: clientId } = await registered.json() as { client_id: string };
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    const authorize = new URL(`${AUTH}/oauth/authorize`);

    authorize.search = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_challenge: challenge,
        code_challenge_method: "S256",
        state: "e2e",
        scope: "openid email",
    }).toString();

    await signIn(page, email);
    await page.goto(authorize.toString());

    await expect(page).toHaveURL(/\/oauth\/consent\?authorization_id=/);
    await expect(page.getByText("e2e MCP 클라이언트")).toBeVisible();

    const callback = page.waitForURL((url) => url.pathname === "/e2e-oauth-callback");

    await page.getByRole("button", { name: "연결하기" }).click();
    await callback;

    const code = new URL(page.url()).searchParams.get("code") ?? "";

    expect(code).not.toBe("");

    const exchanged = await request.post(`${AUTH}/oauth/token`, {
        form: { grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier },
    });

    expect(exchanged.ok(), await exchanged.text()).toBe(true);

    const { access_token: accessToken } = await exchanged.json() as { access_token: string };
    const call = async (body: Record<string, unknown>) =>
        await (await request.post("/api/mcp", {
            headers: { authorization: `Bearer ${accessToken}` },
            data: { jsonrpc: "2.0", ...body },
        })).json() as { result?: { content?: Array<{ text: string }>; tools?: Array<{ name: string }> } };

    return call;
};
