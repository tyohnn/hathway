import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwind from "@tailwindcss/postcss";
import { build } from "esbuild";
import postcss from "postcss";

/**
 * 화면을 HTML 한 장으로 굽는다.
 *
 *   node apps/web/src/modules/plugin/app/build.mjs
 *
 * 호스트는 화면 자원을 글 한 덩이로 받아 iframe 에 띄운다. 밖의 주소를 부를 수 없으므로 스크립트와 스타일을 그 안에 담는다.
 * 스크립트는 React 와 tyohnn 의 컴포넌트를 함께 묶고(esbuild), 스타일은 graphite 를 Tailwind 로 굽는다(`app.css`).
 * 구운 것은 `bundle.generated.ts` 에 적어 커밋한다. Next 가 그 상수를 그대로 싣기 때문에 배포에 굽는 단계가 따로 없다.
 *
 * ⚠ **`app/` 을 고쳤으면 이 스크립트를 다시 돌린다.** 잊으면 `package.test.ts` 가 「구운 앱이 소스와 같다」에서 빨개진다.
 * ⚠ **이름까지 줄인다.** React 를 함께 묶으면 이름을 두고는 묶음이 두 배가 된다. 구운 파일은 사람이 읽는 글이 아니므로
 *    바뀐 것은 구운 파일이 아니라 소스의 diff 로 읽는다.
 * ⚠ **아이콘은 앱과 같은 판을 쓴다.** `@hathway/ui/icons` 는 앱의 tsconfig `paths` 가 phosphor 판을 가리킨다. esbuild 는 그 설정을
 *    읽지 않으므로 같은 자리를 `alias` 로 다시 적는다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "bundle.generated.ts");
const ui = join(here, "../../../../../../packages/ui/src");

const icons = join(ui, "icons/libraries/phosphor.tsx");

/**
 * 아이콘 판은 이름마다 `icon(Glyph)` 를 불러 내보낸다. 그 부름에 부작용이 없다고 적어 줘야 쓰지 않는 아이콘 백칠십 개와 그 그림이
 * 묶음에서 빠진다(빼지 않으면 묶음이 400KB 늘어난다). 원본은 tyohnn 의 것이라 고치지 않고, 읽어 들일 때만 표시를 붙인다.
 */
const pureIcons = {
    name: "pure-icons",
    setup(builder)
    {
        builder.onLoad({ filter: /icons\/libraries\/phosphor\.tsx$/ }, () => ({
            contents: readFileSync(icons, "utf8").replace(/= icon\(/g, "= /* @__PURE__ */ icon("),
            loader: "tsx",
            resolveDir: dirname(icons),
        }));
    },
};

export const bundleSource = async () =>
{
    const result = await build({
        entryPoints: [join(here, "main.tsx")],
        bundle: true,
        write: false,
        format: "iife",
        target: "es2022",
        jsx: "automatic",
        alias: { "@hathway/ui/icons": icons },
        plugins: [pureIcons],
        // React 는 이 값을 보고 개발용 검사를 뺀다
        define: { "process.env.NODE_ENV": "\"production\"" },
        minify: true,
        charset: "utf8",
        legalComments: "none",
        logLevel: "silent",
    });
    // 스크립트 안의 닫는 태그가 HTML 을 일찍 닫지 않게 한다
    const script = (result.outputFiles[0]?.text ?? "").replace(/<\/script/gi, "<\\/script");
    const entry = join(here, "app.css");
    const style = (await postcss([tailwind({ base: here, optimize: { minify: true } })]).process(readFileSync(entry, "utf8"), { from: entry })).css.trim();
    const html = "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">"
        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Hathway 기업분석</title>"
        + `<style>${style}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;

    return "// 생성물이다. 손으로 고치지 않는다. `app/` 을 고친 뒤 `node src/modules/plugin/app/build.mjs` 로 다시 굽는다.\n"
        + `export const APP_HTML = ${JSON.stringify(html)};\n`;
};

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    writeFileSync(target, await bundleSource());
    console.log(`구웠다: ${target}`);
}
