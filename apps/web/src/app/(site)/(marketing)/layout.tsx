import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";

import "../site.css";

/**
 * 첫 화면과 블로그의 틀. 앱의 셸(`(app)`)을 쓰지 않는다. 사이드바는 앱 안에서 할 일을 고르는 자리라 처음 온 사람에게는
 * 뜻이 없다. 문서와 새 소식은 같은 머리 아래에 제 틀이 따로 있다(`docs/layout.tsx` · `changelog/layout.tsx`).
 *
 * ⚠ **공개 화면에는 문이 없다.** 게이트(`AuthGate`)를 두지 않으므로 `(site)` 아래에 조직의 데이터를 읽는 화면을 두지 않는다.
 *    공개 경로는 `middleware.ts` 의 `PUBLIC_PATHS` 와 짝이다.
 */
export default function MarketingLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <div className="flex min-h-svh flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}
