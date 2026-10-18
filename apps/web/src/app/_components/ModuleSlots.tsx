import { Suspense } from "react";

import { MODULE_ROOTS, MODULE_SIGNED_IN, MODULE_SIGNED_OUT, type SignedIn } from "@/lib/moduleClient";

/**
 * 모듈이 브라우저 쪽에 둔 컴포넌트를 그리는 자리 셋(`lib/moduleClient.ts`). 켠 모듈이 없으면 아무것도 그리지 않는다.
 *
 * ⚠ **자리마다 `<Suspense>` 로 감싼다.** 모듈의 컴포넌트는 주소(`usePathname`)를 읽을 수 있고, `cacheComponents` 에서
 *    그것이 경계 밖에 있으면 빌드가 실패한다. 모듈마다 감싸기를 잊지 않게 코어가 감싼다.
 */
export function ModuleRoots()
{
    return (
        <Suspense fallback={null}>
            {MODULE_ROOTS.map((Root, index) => <Root key={index} />)}
        </Suspense>
    );
}

export function ModuleSignedIn(props: SignedIn)
{
    return (
        <Suspense fallback={null}>
            {MODULE_SIGNED_IN.map((Slot, index) => <Slot key={index} {...props} />)}
        </Suspense>
    );
}

export function ModuleSignedOut()
{
    return (
        <Suspense fallback={null}>
            {MODULE_SIGNED_OUT.map((Slot, index) => <Slot key={index} />)}
        </Suspense>
    );
}
