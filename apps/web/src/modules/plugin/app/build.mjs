import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

/**
 * 화면을 HTML 한 장으로 굽는다.
 *
 *   node apps/web/src/modules/plugin/app/build.mjs
 *
 * 호스트는 화면 자원을 글 한 덩이로 받아 iframe 에 띄운다. 밖의 주소를 부를 수 없으므로 스크립트와 스타일을 그 안에 담는다.
 * 구운 것은 `bundle.generated.ts` 에 적어 커밋한다. Next 가 그 상수를 그대로 싣기 때문에 배포에 굽는 단계가 따로 없다.
 *
 * ⚠ **`app/` 을 고쳤으면 이 스크립트를 다시 돌린다.** 잊으면 `package.test.ts` 가 「구운 앱이 소스와 같다」에서 빨개진다.
 * ⚠ **이름은 줄이지 않는다.** 줄인 이름은 굽는 판마다 달라져 바뀐 줄을 읽을 수 없다. 저장소의 검사도 `.ts` 를 글로
 *    훑기 때문에, 우연히 생긴 짧은 이름이 폐기된 표기로 잡힌다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "bundle.generated.ts");

export const bundleSource = async () =>
{
    const result = await build({
        entryPoints: [join(here, "main.ts")],
        bundle: true,
        write: false,
        format: "iife",
        target: "es2022",
        minifyWhitespace: true,
        minifySyntax: true,
        charset: "utf8",
        legalComments: "none",
        logLevel: "silent",
    });
    // 스크립트 안의 닫는 태그가 HTML 을 일찍 닫지 않게 한다
    const script = (result.outputFiles[0]?.text ?? "").replace(/<\/script/gi, "<\\/script");
    const style = readFileSync(join(here, "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").trim();
    const html = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">"
        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>쪽지</title>"
        + `<style>${style}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;

    return "// 생성물이다. 손으로 고치지 않는다. `app/` 을 고친 뒤 `node src/modules/plugin/app/build.mjs` 로 다시 굽는다.\n"
        + `export const APP_HTML = ${JSON.stringify(html)};\n`;
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    writeFileSync(target, await bundleSource());
    console.log(`구웠다: ${target}`);
}
