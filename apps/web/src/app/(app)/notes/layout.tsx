import type { ReactNode } from "react";

/**
 * 쪽지 화면의 레이아웃. 본문 옆에 다이얼로그 자리(`@modal`) 하나를 둔다.
 *
 * ⚠ **다이얼로그는 주소다.** 쪽지 화면에서 `/notes/new` 로 가면 `@modal/(.)new` 가 가로채 목록 위에 다이얼로그를 열고, 주소로 바로 오거나
 *    새로 고치면 `new/page.tsx` 가 전체 페이지로 선다. 뒤로 가기가 다이얼로그를 닫는다.
 * ⚠ **`@modal` 은 맞는 페이지가 없으면 앞의 것을 그대로 둔다**(부드러운 이동). 그래서 `/notes` 와 그 아래 다른 주소에는 아무것도 그리지 않는
 *    페이지(`@modal/page.tsx` · `@modal/[...catchAll]`)를 둔다. 없으면 쓰고 목록으로 돌아와도 다이얼로그가 남는다.
 */
export default function NotesLayout({ children, modal }: { readonly children: ReactNode; readonly modal: ReactNode })
{
    return (
        <>
            {children}
            {modal}
        </>
    );
}
