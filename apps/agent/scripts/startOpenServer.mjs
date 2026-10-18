import { spawn } from "node:child_process";
import net from "node:net";

/**
 * 로컬 계정 문이 열린 둘째 프로덕션 서버를 띄운다 (e2e 전용).
 *
 * e2e 는 서버 둘을 상대로 돈다. 닫힌 서버(4410)가 「배포에서는 그 칸이 없다」를 지키고, 열린 서버(4411)가
 * 로그인해서 화면을 끝까지 몬다. 둘 다 **같은 프로덕션 빌드**를 쓴다 — `ALLOW_LOCAL_ACCOUNTS` 는
 * 서버에서 읽는 값이라 빌드에 박히지 않고, 그래서 한 번 빌드해 두 모양으로 띄울 수 있다.
 *
 * ⚠ **빌드가 끝나기를 기다린다.** Playwright 는 `webServer` 항목들을 나란히 띄우는데, 빌드는 첫째 항목의
 *    명령 안에서 돈다. 기다리지 않고 `next start` 를 부르면 「no production build found」로 즉시 죽는다.
 *    닫힌 서버의 포트가 응답하는 것이 곧 빌드가 끝났다는 신호다 — `.next/BUILD_ID` 의 존재로 재면 지난
 *    빌드의 흔적을 새 빌드로 착각한다.
 */
const WAIT_FOR_PORT = 4410;
const OWN_PORT = 4411;
const RETRY_MS = 500;

const reachable = (port) =>
    new Promise((resolve) =>
    {
        const socket = net.connect(port, "127.0.0.1");

        socket.on("connect", () =>
        {
            socket.end();
            resolve(true);
        });

        socket.on("error", () =>
        {
            socket.destroy();
            resolve(false);
        });
    });

while (!(await reachable(WAIT_FOR_PORT)))
{
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
}

const child = spawn("npx", ["next", "start", "-p", String(OWN_PORT)], {
    stdio: "inherit",
    env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
