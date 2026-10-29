import type { Release } from "../types";

/**
 * 새 소식 목록. 판을 낼 때 이 폴더에 `<판 번호>.mdx` 를 두고 여기 맨 위에 한 줄, `bodies.ts` 에 한 줄을 더한다.
 * 제목 아래 큰 그림은 `public/changelog/<판 번호>.png` 에 두고 `image` 에 적는다. 폭과 높이는 파일의 실제 픽셀이다.
 *
 * ⚠ 새 소식은 사람이 알아야 할 변화만 적는다. 고친 파일이나 내부 작업은 커밋 기록의 몫이다(`ux-writing` 「개발의 말」).
 */
export const RELEASES = [
    { version: "0.1.0", title: "ChatGPT 앱 첫 버전", date: "2026-10-18" },
] as const satisfies ReadonlyArray<Release>;

export type ReleaseVersion = (typeof RELEASES)[number]["version"];
