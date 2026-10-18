import type { Metadata } from "next";

import "./globals.css";

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
    // 탭 제목은 「화면 · Hathway Agent」 한 모양이다. 화면은 앞말만 적는다
    title: { default: "Hathway Agent", template: "%s · Hathway Agent" },
    robots: { index: false, follow: false },
};

export default function RootLayout(
    { children }: Readonly<{ children: React.ReactNode }>,
)
{
    return (
        <html className={tyohnnHtmlClassName} lang="ko">
            <body className="bg-background text-foreground antialiased">
                {children}
            </body>
        </html>
    );
}
