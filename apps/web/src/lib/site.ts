/**
 * 이 서비스의 공개 주소. 문서에 적는 명령(MCP 연결)처럼 주소가 글에 들어가는 자리가 읽는다.
 *
 * ⚠ **빌드 때 박힌다.** `NEXT_PUBLIC_` 이라 배포마다 Production 과 Preview 에 넣는다. 없으면 로컬 개발 주소다.
 */
export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4400").replace(/\/$/, "");

/**
 * 검색에 싣는 화면의 `robots`. 뿌리 레이아웃은 모든 화면을 검색에서 빼 두고(`noindex`), 공개 화면의 레이아웃과 페이지만 이 값으로 연다.
 * 로그인 · 앱 · 동의 화면이 실수로 검색에 실리지 않게 기본을 닫아 둔 것이다.
 */
export const INDEXABLE = { index: true, follow: true } as const;
