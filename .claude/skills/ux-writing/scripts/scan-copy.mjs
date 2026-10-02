#!/usr/bin/env node
/**
 * 화면의 글 가운데 기계로 잴 수 있는 것만 잰다. `ux-writing` 스킬의 마지막 확인이다.
 *
 *   node .claude/skills/ux-writing/scripts/scan-copy.mjs apps/web/src/app apps/web/src/components
 *
 * `.tsx` · `.ts` 에서 한글이 든 문자열과 JSX 글을, `.mdx` 에서 코드 블록 밖의 줄을 뽑아 여섯 가지를 본다.
 *
 *   개발의 말    구현 · 식별자 · 개발 상태 · 내부 조직의 말
 *   문체         합쇼체(~습니다) · 과도한 경어(~시겠어요) · 수동형(되었어요)
 *   다이얼로그   물러서는 버튼의 「취소」
 *   부호         느낌표 여러 개
 *   조사         영문 · 숫자 뒤에 띄어 쓴 조사(「Claude 에」 → 「Claude에」)
 *   길이         한 줄에 60자를 넘는 글(화면에서 두 줄이 넘기 쉽다). MDX 의 산문에는 걸지 않는다
 *
 * ⚠ **글자로 드러나는 것만 잡는다.** 「이 글이 필요한가」는 사람이 판단한다. 조용하다고 화면이 좋다는 뜻은 아니다.
 * ⚠ 주석 · 테스트 · 로그 · 오류 객체의 사유는 보지 않는다. 그 글은 화면에 서지 않는다(서면 그것이 문제다).
 * 걸린 줄을 일부러 두려면 그 줄 끝에 `// ux-writing: 까닭` 을 적는다. 까닭이 없으면 두지 않는다.
 * 파일이 통째로 모델이 읽는 글(도구 설명 · 프롬프트 · MCP 프로토콜)이면 머리 40줄 안에 `ux-writing-file: 까닭` 을 적는다.
 * 그 파일은 읽지 않고 끝에 목록으로만 보인다. 빠진 파일이 늘어나는 것을 사람이 볼 수 있게.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = process.argv.slice(2);

if (roots.length === 0)
{
    console.error("사용법: node scan-copy.mjs <폴더> [폴더 …]");
    process.exit(2);
}

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", "e2e", ".well-known"]);
const HANGUL = /[가-힣]/;

/** 화면에 서지 않는 줄. 주석(JSX 주석 포함) · 로그 · 오류의 사유 */
const NOT_UI = /^\s*(\/\/|\/\*|\*|\{\/\*)|\*\/\}\s*$|Effect\.log|console\.|new \w*Error\(|super\(|reason:|throw |logWarning|assert\.|expect\(|describe\(|it\(|test\(/;

const RULES = [
    {
        id: "개발의 말",
        test: /(서버|DB|데이터베이스|API|스키마|캐시|토큰|워크플로|스텝|훅|세션|스트림|쿼리|레코드|엔티티|테넌트|멤버십|행위자|스코프|트랜잭션|모델을 부르|로그를|null|undefined|id=|준비 중|미구현|TODO|임시|테스트용|더미|연습 모드|\(beta\))/,
        hint: "사람이 겪는 결과로 말하거나 지운다",
    },
    {
        id: "합쇼체",
        test: /(니다|니까|십시오)([.?!]|\s|$)/,
        hint: "해요체로 맺는다(~해요 · ~해 주세요)",
    },
    {
        id: "과도한 경어",
        test: /(시겠어요|시겠습니까|하시나요|시나요|께서|님께|계시|여쭈)/,
        hint: "「~할까요?」「~에게」「있다」「묻다」로 쓴다",
    },
    {
        id: "수동형",
        test: /(되었|되어요|되어 있|되어졌|어졌어요)/,
        hint: "능동형이나 짧은 꼴로(저장했어요 · 됐어요 · 돼요)",
    },
    {
        id: "취소 버튼",
        test: /^취소$/,
        hint: "다이얼로그의 물러서는 버튼은 「닫기」로 쓴다",
    },
    {
        id: "조사 띄어쓰기",
        test: /[A-Za-z0-9)] (을|를|이|가|은|는|에|에서|에게|의|와|과|로|으로|도|만|까지)(?=[\s.,!?」)]|$)/,
        hint: "화면의 글에서는 영문 · 숫자 뒤의 조사를 붙여 쓴다(Claude에 · Scaffold를)",
    },
    {
        id: "느낌표",
        test: /!{2,}|!\s*[가-힣].*!/,
        hint: "느낌표는 감정이 걸린 순간에 하나까지",
    },
];

/** 한 줄에서 한글이 든 글 조각을 뽑는다. 문자열 · 템플릿 · JSX 글 */
const fragments = (line) =>
{
    const found = [];

    for (const match of line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}]+)</g))
    {
        const text = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? "").trim();

        if (HANGUL.test(text))
        {
            found.push(text);
        }
    }

    // 줄 전체가 JSX 글인 경우(여는 태그와 닫는 태그가 다른 줄에 있다)
    if (found.length === 0 && HANGUL.test(line) && !/[=(;]/.test(line) && !/^\s*[<{]/.test(line))
    {
        found.push(line.trim());
    }

    return found;
};

const walk = (path) =>
{
    if (statSync(path).isFile())
    {
        return [path];
    }

    return readdirSync(path).flatMap((entry) =>
        (SKIP_DIRS.has(entry) ? [] : walk(join(path, entry))));
};

const problems = [];
const skippedFiles = [];
let scanned = 0;

/** 머리 40줄 안의 `ux-writing-file: 까닭`. 까닭이 비었으면 빼지 않는다 */
const FILE_MARK = /ux-writing-file:\s*\S/;

for (const root of roots)
{
    for (const file of walk(root))
    {
        if (!/\.(tsx|ts|mdx)$/.test(file) || /\.(test|spec)\.tsx?$/.test(file) || file.endsWith(".d.ts"))
        {
            continue;
        }

        const lines = readFileSync(file, "utf8").split("\n");
        const mdx = file.endsWith(".mdx");

        if (lines.slice(0, 40).some((line) => FILE_MARK.test(line)))
        {
            skippedFiles.push(relative(process.cwd(), file));

            continue;
        }
        let inCode = false;

        lines.forEach((line, index) =>
        {
            // MDX 는 코드 블록 밖의 줄이 모두 글이다. 인라인 코드는 값이라 뺀다
            if (mdx && line.trimStart().startsWith("```"))
            {
                inCode = !inCode;

                return;
            }

            if (mdx ? inCode : (NOT_UI.test(line) || line.includes("ux-writing:")))
            {
                return;
            }

            const texts = mdx
                ? (HANGUL.test(line) ? [line.replace(/`[^`]*`/g, "").replace(/^\s*([-*]|\d+\.|#+)\s*/, "").trim()] : [])
                : fragments(line);

            for (const text of texts)
            {
                scanned += 1;

                for (const rule of RULES)
                {
                    if (rule.test.test(text))
                    {
                        problems.push(`${relative(process.cwd(), file)}:${index + 1}  [${rule.id}] ${text}\n      → ${rule.hint}`);
                    }
                }

                // 템플릿의 자리(`${…}`)는 길이에서 뺀다. 들어갈 값은 이 검사가 알 수 없다
                if (!mdx && [...text.replace(/\$\{[^}]*\}/g, "")].length > 60)
                {
                    problems.push(`${relative(process.cwd(), file)}:${index + 1}  [길이] ${text}\n      → 한 줄에 한 메시지. 줄이거나 나눈다`);
                }
            }
        });
    }
}

console.log(`화면의 글 ${scanned}조각을 읽었다.`);

if (skippedFiles.length > 0)
{
    console.log(`모델이 읽는 글이라 뺀 파일 ${skippedFiles.length}개: ${skippedFiles.join(" · ")}`);
}

if (problems.length === 0)
{
    console.log("글자로 드러나는 어긋남 없음. 「이 글이 필요한가」는 사람이 한 번 더 본다.");
    process.exit(0);
}

console.error(`\n✗ ${problems.length}곳\n`);
console.error(problems.join("\n"));
process.exit(1);
