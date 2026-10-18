import { SidebarInset, SidebarProvider } from "@hathway/ui/components/sidebar";

import { docGroups } from "@/content/collections";
import { DOCS } from "@/content/docs";
import { paths } from "@/lib/paths";

import "../site.css";
import { DocsSidebar } from "./_components/DocsSidebar";

/**
 * 문서의 틀. tyohnn 의 docs 템플릿(shadcn sidebar-01)이다. 왼쪽 사이드바, 오른쪽에 머리(경로 표시)와 본문과 목차 기둥이
 * 선다. 머리와 본문은 문서마다 달라서 페이지(`[slug]/page.tsx`)가 그린다.
 */
const GROUPS = docGroups(DOCS).map(({ group, docs }) => ({
    group,
    docs: docs.map((doc) => ({ title: doc.title, href: paths.docs(doc.slug) })),
}));

const LINKS = [
    { label: "새 소식", href: paths.changelog() },
    { label: "블로그", href: paths.blog() },
];

export default function DocsLayout({ children }: { readonly children: React.ReactNode })
{
    return (
        <SidebarProvider>
            <DocsSidebar groups={GROUPS} home={paths.landing()} links={LINKS} />
            <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
    );
}
