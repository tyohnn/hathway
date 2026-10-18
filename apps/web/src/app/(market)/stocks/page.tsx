import type { Metadata } from "next";
import { HomeLanding } from "../_components/home-landing";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

export const metadata: Metadata = {
    title: "주식",
};

export default function StocksHomePage()
{
    return <HomeLanding />;
}
