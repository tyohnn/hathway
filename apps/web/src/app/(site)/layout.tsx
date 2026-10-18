import type { Metadata } from "next";

import { INDEXABLE } from "@/lib/site";

/**
 * 공개 화면(첫 화면 · 블로그 · 문서 · 새 소식 · 약관)을 검색에 연다. 뿌리 레이아웃은 막아 두므로 여기 아래만 열린다.
 * 틀은 그리지 않는다. 화면마다 틀이 달라서 `(marketing)` · `docs` · `changelog` 가 제 틀을 갖는다.
 */
export const metadata: Metadata = { robots: INDEXABLE };

export default function SiteLayout({ children }: { readonly children: React.ReactNode })
{
    return children;
}
