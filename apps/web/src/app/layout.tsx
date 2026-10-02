import "./global.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { appName } from "@/lib/shared";
import { isBookHidden } from "@/lib/hidden-books";

// tyohnn:begin fonts
// Fonts of graphite: pretendard · inherit · system · pretendard (sans · heading · mono · hangul), self-hosted by next/font.
import localFont from "next/font/local";

const fontPretendard = localFont({
    variable: "--font-sans-pretendard", display: "swap", adjustFontFallback: false,
    src: [
        { path: "../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2", weight: "400", style: "normal" },
        { path: "../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Medium.woff2", weight: "500", style: "normal" },
        { path: "../../node_modules/pretendard/dist/web/static/woff2/Pretendard-SemiBold.woff2", weight: "600", style: "normal" },
        { path: "../../node_modules/pretendard/dist/web/static/woff2/Pretendard-Bold.woff2", weight: "700", style: "normal" },
    ],
});

// <html>: dark mode (`dark` belongs on <html>: layer-2 values resolve on :root) · font-sans · next/font variables
const tyohnnHtmlClassName = ["dark", "font-sans", fontPretendard.variable].join(" ");
// tyohnn:end fonts

export const metadata: Metadata = {
    title: {
        default: appName,
        template: `%s | ${appName}`,
    },
    description: isBookHidden("book2")
        ? "기업 가치평가를 다루는 투자 교재"
        : "기업 가치평가와 이차전지 산업 분석을 다루는 2권 55장 챕터 교재",
};

export default function Layout({ children }: LayoutProps<"/">)
{
    return (
        <html className={tyohnnHtmlClassName} lang="ko" suppressHydrationWarning>
            <body className="flex min-h-screen flex-col">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
