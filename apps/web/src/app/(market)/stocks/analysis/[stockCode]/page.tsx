import type { Metadata } from "next";
import { GuidePage } from "@/components/company-guide/guide-page";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;


export async function generateMetadata(
    props: PageProps<"/stocks/analysis/[stockCode]">,
): Promise<Metadata>
{
    const { stockCode } = await props.params;
    return { title: `Snapshot · ${stockCode}` };
}

export default async function Page(props: PageProps<"/stocks/analysis/[stockCode]">)
{
    const { stockCode } = await props.params;
    return <GuidePage stockCode={stockCode} menuId="snapshot" />;
}
