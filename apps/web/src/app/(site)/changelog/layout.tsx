import { SiteFooter } from "../_components/SiteFooter";
import { SiteHeader } from "../_components/SiteHeader";

import "../site.css";

/**
 * 새 소식의 틀. 첫 화면과 같은 머리와 발치 사이에 판들이 선다.
 * 판의 짜임(왼쪽 날짜 칸 · 오른쪽 제목 · 그림 · 본문)은 `_components/ReleaseEntry.tsx` 가 갖는다.
 */
export default function ChangelogLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <div className="flex min-h-svh flex-col">
            <SiteHeader />
            <main className="changelog flex-1">{children}</main>
            <SiteFooter />
        </div>
    );
}
