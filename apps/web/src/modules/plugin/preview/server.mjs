import { createHash, randomBytes } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 플러그인의 미리 보기. 호스트(ChatGPT)를 흉내 낸 창을 로컬에 띄워 익스텐션을 눈으로 본다.
 *
 *   npx turbo dev --filter=@hathway/web                       # 먼저 개발 서버를 띄운다
 *   node apps/web/src/modules/plugin/preview/server.mjs        # 그다음 이 서버를 띄우고 찍힌 주소를 연다
 *
 * 실물 ChatGPT 에 붙이려면 공개 주소와 개발자 모드가 있어야 한다. 이 도구는 그 전에 **우리 쪽이 스펙대로 말하는지**를
 * 눌러 보는 자리다. 서버 · DB · 화면은 진짜이고 호스트만 가짜다.
 *
 * 하는 일은 MCP 클라이언트가 하는 일 그대로다. 클라이언트를 동적으로 등록하고 PKCE 로 인가를 청하면, 사람이 개발 서버의
 * 로그인과 동의 화면을 지나 돌아오고, 받은 토큰으로 `/api/mcp` 를 부른다. 그래서 로그인 사슬도 함께 확인된다.
 *
 * ⚠ **로컬 전용이다.** 토큰을 이 프로세스의 메모리에 쥐고 127.0.0.1 에만 선다. 가리키는 서버가 로컬이 아니면 뜨지 않는다.
 * ⚠ **호스트가 스펙을 어떻게 읽는지는 여기서 알 수 없다.** 이 창은 우리가 스펙을 읽은 대로 만든 것이라, 스펙을 잘못 읽었으면
 *    서버와 이 창이 함께 틀린다. 마지막 확인은 실물에 붙여서 한다(`modules/plugin/module.md`).
 */
const here = dirname(fileURLToPath(import.meta.url));
const WEB = process.env.PREVIEW_WEB_URL ?? "http://127.0.0.1:4400";
const AUTH = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54361"}/auth/v1`;
const PORT = Number(process.env.PREVIEW_PORT ?? Number(new URL(WEB).port) + 5);
const SELF = `http://127.0.0.1:${PORT}`;
const LOCAL = new Set(["127.0.0.1", "localhost", "[::1]"]);

if (!LOCAL.has(new URL(WEB).hostname) || !LOCAL.has(new URL(AUTH).hostname))
{
    console.error(`✗ 로컬이 아닌 곳을 가리킨다(${WEB} · ${AUTH}). 미리 보기는 로컬 스택에서만 뜬다.`);
    process.exit(1);
}

/** 플러그인 패키지의 자리. 호스트가 깐 플러그인의 이름 · 소개 · 스킬을 여기서 읽는다 */
const PLUGIN = join(here, "../../../../../../plugin");

/** 플러그인의 매니페스트와 아이콘과 스킬의 머리말을 한 덩이로. 호스트의 플러그인 화면이 그린다 */
const pluginPackage = () =>
{
    const manifest = JSON.parse(readFileSync(join(PLUGIN, "plugin.json"), "utf8"));
    const face = manifest.extensions?.["com.openai"]?.interface ?? {};
    const skills = readdirSync(join(PLUGIN, "skills")).map((name) =>
    {
        const text = readFileSync(join(PLUGIN, "skills", name, "SKILL.md"), "utf8");

        return { name, description: /^description: (.+)$/m.exec(text)?.[1] ?? "", body: text.replace(/^---[\s\S]*?---\n/, "") };
    });

    return {
        name: manifest.name,
        onboardingSkill: manifest.extensions?.["com.openai"]?.onboardingSkill ?? null,
        interface: face,
        icon: readFileSync(join(PLUGIN, String(face.logo ?? "./assets/icon.svg")), "utf8"),
        skills,
        server: `${WEB}/api/mcp`,
    };
};

/** 지금 쥔 토큰과, 인가를 청해 놓고 돌아오기를 기다리는 클라이언트. 한 사람이 쓰는 도구라 하나씩이면 된다 */
let token = null;
let pending = null;

const base64url = (buffer) => buffer.toString("base64url");

const send = (response, status, body, headers = {}) =>
{
    response.writeHead(status, { "cache-control": "no-store", ...headers });
    response.end(body);
};

const redirect = (response, location) => send(response, 302, "", { location });

const fail = (response, message) =>
    send(response, 502, `<!doctype html><meta charset="utf-8"><p>${message}</p><p><a href="/connect">다시 연결하기</a></p>`, { "content-type": "text/html; charset=utf-8" });

/** 클라이언트를 등록하고 사람을 인가 화면으로 보낸다. 로그인하지 않았으면 개발 서버가 로그인부터 시킨다 */
const connect = async (response) =>
{
    const registered = await fetch(`${AUTH}/oauth/clients/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            client_name: "플러그인 미리 보기",
            redirect_uris: [`${SELF}/callback`],
            token_endpoint_auth_method: "none",
            grant_types: ["authorization_code", "refresh_token"],
            response_types: ["code"],
        }),
    });

    if (!registered.ok)
    {
        return fail(response, `클라이언트를 등록하지 못했다(${registered.status}). 로컬 스택이 떠 있는지 본다: supabase start`);
    }

    const verifier = base64url(randomBytes(32));
    const state = base64url(randomBytes(16));
    const authorize = new URL(`${AUTH}/oauth/authorize`);

    pending = { clientId: (await registered.json()).client_id, verifier, state };
    authorize.search = new URLSearchParams({
        response_type: "code",
        client_id: pending.clientId,
        redirect_uri: `${SELF}/callback`,
        code_challenge: base64url(createHash("sha256").update(verifier).digest()),
        code_challenge_method: "S256",
        state,
        scope: "openid email",
    }).toString();

    return redirect(response, authorize.toString());
};

const callback = async (url, response) =>
{
    if (pending === null || url.searchParams.get("state") !== pending.state)
    {
        return fail(response, "기다리던 인가가 아니다. 처음부터 다시 연결한다.");
    }

    const exchanged = await fetch(`${AUTH}/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code: url.searchParams.get("code") ?? "",
            redirect_uri: `${SELF}/callback`,
            client_id: pending.clientId,
            code_verifier: pending.verifier,
        }),
    });

    pending = null;

    if (!exchanged.ok)
    {
        return fail(response, `토큰을 받지 못했다(${exchanged.status}).`);
    }

    token = (await exchanged.json()).access_token;

    return redirect(response, "/");
};

const bodyOf = (request) =>
    new Promise((resolve) =>
    {
        const chunks = [];

        request.on("data", (chunk) => chunks.push(chunk));
        request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

/** 가짜 호스트가 서버에 보내는 JSON-RPC 를 토큰을 붙여 그대로 넘긴다. 새 판의 요청이면 판을 헤더에도 적는다 */
const rpc = async (request, response) =>
{
    const body = await bodyOf(request);
    const version = JSON.parse(body).params?._meta?.["io.modelcontextprotocol/protocolVersion"];
    const answered = await fetch(`${WEB}/api/mcp`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
            ...(typeof version === "string" ? { "mcp-protocol-version": version } : {}),
        },
        body,
    });

    if (answered.status === 401)
    {
        token = null;
    }

    return send(response, answered.status, await answered.text(), { "content-type": "application/json" });
};

createServer((request, response) =>
{
    const url = new URL(request.url ?? "/", SELF);
    const route = `${request.method} ${url.pathname}`;
    const handled = (() =>
    {
        switch (route)
        {
            case "GET /":
                // 주소를 하나로 맞춘다. `localhost` 로 열면 인가가 돌아올 주소와 출처가 어긋난다
                if (request.headers.host !== new URL(SELF).host)
                {
                    return redirect(response, SELF);
                }

                return token === null
                    ? redirect(response, "/connect")
                    : send(response, 200, readFileSync(join(here, "host.html"), "utf8"), { "content-type": "text/html; charset=utf-8" });

            case "GET /connect":
                return connect(response);

            case "GET /callback":
                return callback(url, response);

            case "GET /disconnect":
                token = null;

                return redirect(response, `${WEB}/login`);

            case "GET /plugin":
                return send(response, 200, JSON.stringify(pluginPackage()), { "content-type": "application/json" });

            case "POST /rpc":
                // 이 창에서 온 청만 받는다. 브라우저의 다른 탭이 이 주소로 글을 보내 쥐고 있는 토큰으로 도구를 부르게 두지 않는다
                if (request.headers.origin !== SELF || !String(request.headers["content-type"] ?? "").startsWith("application/json"))
                {
                    return send(response, 403, "{}", { "content-type": "application/json" });
                }

                return token === null ? send(response, 401, "{}", { "content-type": "application/json" }) : rpc(request, response);

            default:
                return send(response, 404, "");
        }
    })();

    Promise.resolve(handled).catch((cause) => fail(response, `개발 서버에 닿지 못했다(${WEB}). 떠 있는지 본다. ${String(cause)}`));
}).listen(PORT, "127.0.0.1", () =>
{
    console.log(`플러그인 미리 보기: ${SELF}`);
    console.log(`  서버 ${WEB}/api/mcp · 인증 ${AUTH}`);
});
