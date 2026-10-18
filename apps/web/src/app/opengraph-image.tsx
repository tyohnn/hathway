import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { LEGAL } from "@/content/legal";

/**
 * 링크를 붙였을 때 뜨는 그림(Open Graph). 모든 화면이 이 그림을 물려받고, 화면이 제 그림을 두면 그쪽이 이긴다.
 *
 * ⚠ **한글 글꼴을 직접 싣는다.** ImageResponse 의 기본 글꼴에는 한글이 없어 네모로 찍힌다. Pretendard 의 KS X 1001 부분 글꼴(woff)을
 *    읽는다. satori 는 woff2 를 읽지 못한다.
 * ⚠ 요청과 상관없는 그림이라 빌드 때 한 번 구워진다. 색은 graphite 어두운 판의 `--background` · `--foreground` · `--muted-foreground` · `--primary` 값을 옮겼다(그림 안에서는 CSS 토큰을 읽지 못한다).
 * ⚠ 이 주소(`/opengraph-image`)는 확장자가 없어 미들웨어의 matcher 가 거르지 못한다. 그래서 `PUBLIC_PATHS` 에 있다.
 */
export const alt = `${LEGAL.service}: DART 공시와 재무 숫자로 읽는 기업분석`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT = join(process.cwd(), "../../node_modules/pretendard/dist/web/static/woff-subset/Pretendard-Bold.subset.woff");

export default async function OpengraphImage(): Promise<ImageResponse>
{
    const font = await readFile(FONT);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    background: "#151515",
                    color: "#f2f2f2",
                    fontFamily: "Pretendard",
                }}
            >
                <div style={{ display: "flex", fontSize: 36, color: "#8c8c8c" }}>{LEGAL.service}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", fontSize: 76, lineHeight: 1.15 }}>공시와 재무 숫자로</div>
                    <div style={{ display: "flex", fontSize: 76, lineHeight: 1.15, color: "#3d4ef5" }}>기업을 읽고 적정가를 계산해요</div>
                </div>
                <div style={{ display: "flex", fontSize: 28, color: "#8c8c8c" }}>DART 자료 기반 · 가치투자 연습 · 투자 자문이 아니에요</div>
            </div>
        ),
        { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700, style: "normal" }] },
    );
}
