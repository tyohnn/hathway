import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MockPlugin } from "./_parts/MockPlugin";

export const metadata: Metadata = { title: "플러그인 목업" };

/**
 * ChatGPT 플러그인 화면의 목업. 구운 화면을 ChatGPT 틀 안에 띄우고 표본 결과로 그린다. 사진을 찍고 눈으로 보는 자리다.
 *
 * ⚠ 개발 서버에서만 선다. 프로덕션 빌드에서는 404 다.
 */
export default function PluginMockPage()
{
    if (process.env.NODE_ENV === "production")
    {
        notFound();
    }

    return <MockPlugin />;
}
