import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "전체 뉴스",
};

export default function StocksNewsPage()
{
    return (
        <div className="mx-auto w-full max-w-3xl">
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">전체 뉴스</h1>
            <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                아직 뉴스가 없어요
            </div>
        </div>
    );
}
