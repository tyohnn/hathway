import type { Metadata } from "next";
import { ThemeSectionPlaceholder } from "@/components/theme-section-placeholder";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

// 아직 내용이 없는 자리라 검색에서 뺀다. 내용이 서면 이 줄의 robots 를 지우고 sitemap(`lib/siteIndex.ts`)에 싣는다
export const metadata: Metadata = { title: "거시경제 분석 · 부동산", robots: { index: false, follow: true } };

export default function Page()
{
    return <ThemeSectionPlaceholder theme="real-estate" section="macro" />;
}
