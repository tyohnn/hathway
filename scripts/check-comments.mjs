#!/usr/bin/env node

/**
 * 주석의 한국어를 `fluent-korean` 규약으로 대조한다.
 *
 * 스캐폴드의 규약을 2026-10-02 에 옮겼다(`docs/개발-방법론.md` 「코드 스타일」). 이 저장소의 주석은
 * 「왜 그렇게 했나」를 담는 설계 문서라서 사람이 읽고, 읽기 어려우면 다음 사람이 그 근거를 지나쳐
 * 같은 사고를 되풀이한다.
 *
 * ⚠ **기계로 잴 수 있는 것만 잰다.** 지침의 알맹이(의미가 있는 성분을 생략하지 않는다, 비유로 일반
 *    동사를 대체하지 않는다)는 사람이 읽어야 안다. 여기서 막는 것은 규칙을 어긴 것이 글자로 드러나는
 *    셋뿐이고, 이 검사가 초록이라고 해서 지침을 지켰다는 뜻은 아니다.
 *
 * ⚠ **적용 범위를 파일 목록으로 들고 다닌다.** 규약을 들이기 전에 쓴 주석이 많아서 저장소 전체를 한 번에
 *    대조하면 아무도 고치지 못하고 검사를 꺼 버리게 된다. 정리한 자리를 아래 목록에 더해 가며 범위를 넓히고,
 *    범위 밖의 파일을 다른 일로 고칠 때 그 파일을 함께 정리해 목록에 올린다.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 지침을 이미 적용한 자리.
 *
 * 여기 없는 파일은 검사하지 않는다. 줄이 아니라 늘어나야 하는 목록이다.
 */
const SCOPE = [
    "scripts/check-comments.mjs",
    "packages/ui/scripts",
];

const SKIP_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", ".git"]);

const HANGUL = /[가-힣]/;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

/**
 * 잴 수 있는 위반 셋.
 *
 * 엠대시는 앞뒤 관계를 지나치게 함축하므로 콜론이나 접속사로 바꾼다(지침 「구 단위」 4).
 * 명사형과 연결어미로 끝나는 문장은 서술어와 종결어미로 맺는다(지침 「문장 단위」 2).
 */
const RULES = [
    {
        id: "엠대시",
        test: (line) => line.includes("—"),
        hint: "엠대시 대신 마침표나 접속사로 문장을 나눌 것",
    },
    {
        id: "명사형 종결",
        test: (line) => /(?:음|함|됨|임|짐)\.\s*$/.test(line),
        hint: "서술어와 종결어미로 맺을 것",
    },
    {
        id: "연결어미 종결",
        test: (line) => /(?:하고|이고|해서|이며|하며|지만|인데)\.\s*$/.test(line),
        hint: "문장을 끝내거나 뒤 절을 이어 적을 것",
    },
];

const filesUnder = (target) =>
{
    const full = join(repoRoot, target);

    if (!statSync(full).isDirectory())
    {
        return [full];
    }

    const found = [];

    const walk = (dir) =>
    {
        for (const entry of readdirSync(dir))
        {
            if (SKIP_DIRS.has(entry))
            {
                continue;
            }

            const path = join(dir, entry);

            if (statSync(path).isDirectory())
            {
                walk(path);
                continue;
            }

            if (/\.(ts|tsx|mjs)$/.test(entry))
            {
                found.push(path);
            }
        }
    };

    walk(full);

    return found;
};

const offenses = [];
let scanned = 0;
let commentLines = 0;

for (const target of SCOPE)
{
    for (const path of filesUnder(target))
    {
        scanned += 1;

        const lines = readFileSync(path, "utf8").split("\n");

        lines.forEach((line, index) =>
        {
            if (!HANGUL.test(line) || !COMMENT_LINE.test(line))
            {
                return;
            }

            commentLines += 1;

            for (const rule of RULES)
            {
                if (rule.test(line))
                {
                    offenses.push({
                        where: `${relative(repoRoot, path)}:${index + 1}`,
                        rule: rule.id,
                        hint: rule.hint,
                        line: line.trim(),
                    });
                }
            }
        });
    }
}

console.log(`주석 ${commentLines}줄을 파일 ${scanned}개에서 읽었다 (적용 범위 ${SCOPE.length}자리).`);

if (offenses.length === 0)
{
    console.log("지침을 어긴 줄 없음.");
    process.exit(0);
}

console.error(`\n✗ 지침을 어긴 줄 ${offenses.length}개\n`);

for (const offense of offenses)
{
    console.error(`  ${offense.where}  [${offense.rule}] ${offense.hint}`);
    console.error(`    ${offense.line}`);
}

console.error("\n규약은 .claude/skills/fluent-korean/ 에 있다. 범위 밖 파일을 고쳤다면 이 스크립트의 SCOPE 에 더할 것.");
process.exit(1);
