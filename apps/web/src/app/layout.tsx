import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { appName } from "@/lib/shared";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

import { ModuleRoots } from "./_components/ModuleSlots";

// tyohnn:begin fonts
// Fonts of graphite: pretendard · inherit · system · pretendard (sans · heading · mono · hangul), self-hosted by next/font.
import localFont from "next/font/local";

const fontPretendard = localFont({
    variable: "--font-sans-pretendard", display: "swap", adjustFontFallback: false,
    src: [
        { path: "../../../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2", weight: "400", style: "normal" },
        { path: "../../../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2", weight: "500", style: "normal" },
        { path: "../../../../node_modules/pretendard/dist/web/static/woff2/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
        { path: "../../../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Bold.woff2", weight: "700", style: "normal" },
    ],
});

// <html>: dark mode (`dark` belongs on <html>: layer-2 values resolve on :root) · font-sans · next/font variables
const tyohnnHtmlClassName = ["dark", "font-sans", fontPretendard.variable].join(" ");
// tyohnn:end fonts

export const metadata: Metadata =
{
    // 탭 제목은 「화면 | 제품 이름」 한 모양이다. 화면은 앞말만 적는다
    title: { default: appName, template: `%s | ${appName}` },
    description: "DART 공시와 재무 숫자로 기업을 읽고 적정주가를 계산하는 투자 분석",
    // OG 이미지와 canonical 의 상대 주소가 이 주소에서 풀린다
    metadataBase: new URL(SITE_URL),
    // 기본은 검색에서 뺀다. 공개 화면은 `(site)/layout.tsx` · `(market)/layout.tsx` · `book/layout.tsx` 가 연다
    robots: { index: false, follow: false },
};

export default function RootLayout(
    { children }: Readonly<{ children: React.ReactNode }>,
)
{
    return (
        <html className={tyohnnHtmlClassName} lang="ko" suppressHydrationWarning>
            <body className="bg-background text-foreground antialiased">
                {/* 밝고 어두운 판 전환(next-themes)과 툴팁. 종목 화면이 쓴다 */}
                <Providers>
                    {children}
                    <ModuleRoots />
                </Providers>
            </body>
        </html>
    );
}
