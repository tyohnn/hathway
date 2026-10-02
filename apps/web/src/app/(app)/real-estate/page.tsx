import type { Metadata } from "next";
import Link from "next/link";
import { THEME_SECTIONS, sectionHref } from "@/lib/nav";

export const metadata: Metadata = {
    title: "부동산",
};

export default function RealEstateHomePage()
{
    return (
        <div className="mx-auto w-full max-w-2xl">
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">부동산</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                지금은 리서치 보드를 쓸 수 있어요.
            </p>
            <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
                {THEME_SECTIONS.map((section) => (
                    <li key={section.id}>
                        <Link
                            href={sectionHref("real-estate", section.id)}
                            className="flex flex-col px-4 py-3 hover:bg-accent/40"
                        >
                            <span className="font-medium">{section.label}</span>
                            <span className="text-xs text-muted-foreground">{section.description}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
