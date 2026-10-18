import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 마이그레이션의 판 번호가 겹치지 않는지 본다.
 *
 * ⚠ **판 번호는 파일 이름의 앞자리 하나다.** 같은 번호를 단 파일이 둘이면 두 번째 파일이
 *    `supabase_migrations.schema_migrations` 에 같은 줄을 넣으려다 멈춘다. 그 자리에서 마이그레이션이
 *    통째로 서므로, 앞에서 이미 적용된 것들까지 되돌려야 하는 상태가 된다.
 *
 * ⚠ **이 고장은 로컬에서 드러나지 않는다.** 이미 적용된 데이터베이스에 다시 넣는 자리까지 가지 않기
 *    때문이다. 두 사람이 다른 가지에서 같은 시각을 골라 쓰면 그 둘이 합쳐지는 날에야 처음 드러나고,
 *    그때 빨개지는 것은 고친 사람이 아니라 뒤에 민 사람이다(2026-09-17 에 실제로 두 번 겪었다).
 *
 * 무엇이 옳은지는 이 검사가 정하지 않는다. 겹친다는 사실만 말하고 어느 쪽을 옮길지는 사람이 정한다.
 */
const here = dirname(fileURLToPath(import.meta.url));
const migrations = resolve(here, "../../../supabase/migrations");

const byVersion = new Map();

for (const name of readdirSync(migrations))
{
    if (!name.endsWith(".sql"))
    {
        continue;
    }

    const version = name.split("_")[0];

    byVersion.set(version, [...(byVersion.get(version) ?? []), name]);
}

const collided = [...byVersion.entries()].filter(([, names]) => names.length > 1);

console.log(`마이그레이션 ${byVersion.size}개의 판 번호를 대조했다 (${join(migrations)}).`);

if (collided.length === 0)
{
    console.log("겹치는 판 번호 없음.");
}
else
{
    for (const [version, names] of collided)
    {
        console.error(`\n판 번호 ${version} 이(가) 겹친다:`);

        for (const name of names)
        {
            console.error(`  ${name}`);
        }
    }

    console.error("\n한쪽의 앞자리를 비어 있는 번호로 바꿀 것. 무엇이 먼저 돌아야 하는지를 보고 고른다.");
    process.exit(1);
}
