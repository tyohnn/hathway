import type { Metadata } from "next";

import { LEGAL } from "@/content/legal";
import { siteLd } from "@/lib/discovery";
import { INDEXABLE, SITE_URL } from "@/lib/site";
import { SITE_INDEX } from "@/lib/siteIndex";

import { JsonLd } from "./_components/JsonLd";

/**
 * 공개 화면(블로그 · 문서 · 새 소식 · 약관)을 검색에 연다. 뿌리 레이아웃은 막아 두므로 여기 아래만 열린다.
 * 틀은 그리지 않는다. 화면마다 틀이 달라서 `(marketing)` · `docs` · `changelog` 가 제 틀을 갖는다.
 * 운영 주체와 서비스의 JSON-LD(`Organization` · `WebApplication`)는 여기서 한 번 싣는다. 값은 요청과 상관없어 틀에 구워진다.
 */
export const metadata: Metadata = { robots: INDEXABLE };

const LD = siteLd(SITE_URL, SITE_INDEX.name, SITE_INDEX.description, { name: LEGAL.operator, email: LEGAL.contact });

export default function SiteLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <>
            <JsonLd data={LD} />
            {children}
        </>
    );
}
