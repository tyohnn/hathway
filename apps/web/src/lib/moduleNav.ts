import type { NavEntry } from "./paths";


/**
 * 켠 모듈이 사이드바에 내는 메뉴. 서버와 클라이언트가 함께 읽어서 `lib/modules.ts`(서버 전용)와 따로 둔다.
 * 모듈을 잇는 파일은 이 둘뿐이다(`check:modules`).
 *
 * ⚠ **모듈을 떼는 일은 `scaffold:module <이름>` 이 붙은 줄을 걷는 것이다.**
 */
export const MODULE_NAV: ReadonlyArray<NavEntry> = [
];
