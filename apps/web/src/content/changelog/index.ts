import type { Release } from "../types";

/**
 * 새 소식 목록. 판을 낼 때 이 폴더에 `<판 번호>.mdx` 를 두고 여기 맨 위에 한 줄, `bodies.ts` 에 한 줄을 더한다.
 *
 * ⚠ 새 소식은 사람이 알아야 할 변화만 적는다. 고친 파일이나 내부 작업은 커밋 기록의 몫이다(`ux-writing` 「개발의 말」).
 */
export const RELEASES = [
    { version: "0.1.0", title: "첫 공개", date: "2026-09-29" },
] as const satisfies ReadonlyArray<Release>;

export type ReleaseVersion = (typeof RELEASES)[number]["version"];
