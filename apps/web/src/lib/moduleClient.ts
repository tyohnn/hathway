import type { ComponentType } from "react";

import { AnalyticsRoot } from "@/modules/posthog/AnalyticsRoot"; // scaffold:module posthog
import { Identify } from "@/modules/posthog/Identify"; // scaffold:module posthog
import { Reset } from "@/modules/posthog/Reset"; // scaffold:module posthog

/**
 * 켠 모듈을 **브라우저 쪽**에 잇는 곳이다. 서버의 확장 지점은 `lib/modules.ts` 가, 메뉴는 `lib/moduleNav.ts` 가 잇는다.
 * 모듈을 잇는 파일은 이 셋뿐이다(`check:modules`).
 *
 * 코어는 자리 셋을 내놓고, 모듈은 그 자리에 클라이언트 컴포넌트를 둔다. 코어가 그리는 곳은 `app/_components/ModuleSlots.tsx` 다.
 *
 *   · `MODULE_ROOTS`       모든 화면의 `<body>` 끝. 분석 도구를 여는 일이나 동의 배너처럼 화면을 가리지 않는 것
 *   · `MODULE_SIGNED_IN`   로그인한 셸(사이드바의 계정 자리). 누가 들어왔는지 알아야 하는 것
 *   · `MODULE_SIGNED_OUT`  로그인 화면. 로그아웃하면 돌아오는 자리라 앞 사람의 흔적을 지우는 일
 *
 * ⚠ **모듈을 떼는 일은 `scaffold:module <이름>` 이 붙은 줄을 걷는 것이다.** 자리가 비면 코어는 아무것도 그리지 않는다.
 * ⚠ **로그인한 사람은 id 두 개로만 건넨다.** 행위자(`Actor`) 객체를 클라이언트에 넘기지 않는다(`Actor` 의 주석).
 */
export interface SignedIn
{
    readonly accountId: string;
    readonly tenantId: string;
}

export const MODULE_ROOTS: ReadonlyArray<ComponentType> = [
    AnalyticsRoot, // scaffold:module posthog
];

export const MODULE_SIGNED_IN: ReadonlyArray<ComponentType<SignedIn>> = [
    Identify, // scaffold:module posthog
];

export const MODULE_SIGNED_OUT: ReadonlyArray<ComponentType> = [
    Reset, // scaffold:module posthog
];
