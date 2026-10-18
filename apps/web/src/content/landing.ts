import { FileText, Lock, Sparkles, Terminal, Users } from "@hathway/ui/icons";

import type { IconComponent } from "@hathway/ui/icons/names";

/**
 * 첫 화면(`app/(site)/(marketing)/page.tsx`)의 글 전부. 화면의 짜임은 `app/(site)/_components/landing/` 이 갖고, 이 파일은 말만 갖는다.
 *
 * ⚠ **새 제품은 이 파일 하나를 제 말로 다시 쓴다**(`/scaffold-fit` 5번). 칸의 수와 모양은 그대로 두어도 화면이 선다. 칸을 늘리거나
 *    줄여도 짜임이 따라온다(기능은 첫 칸이 두 칸을 써서 다섯이나 여덟이 꼭 맞고, 절차는 셋, 질문은 셋에서 다섯이 보기 좋다).
 * ⚠ **지어낸 증거를 두지 않는다.** 고객 로고 · 후기 · 「1만 팀이 쓴다」 같은 숫자는 실제로 있을 때만 쓴다. 없는 것을 꾸미면 첫 화면이
 *    가장 먼저 거짓말을 한다. 그래서 이 짜임에는 그런 칸이 없다.
 * ⚠ 글은 `ux-writing` 의 기준(해요체 · 없어도 되는 말은 넣지 않는다)을 지난다. 제목은 무엇이 좋아지는지를, 설명은 어떻게를 말한다.
 */
export interface LandingContent
{
    readonly hero: {
        /** 제목. 줄마다 한 덩어리이고, 마지막 줄이 강조색을 입는다 */
        readonly title: ReadonlyArray<string>;
        readonly lead: string;
        readonly primary: { readonly label: string; readonly href: "docs" | "login" };
        readonly secondary: { readonly label: string; readonly href: "docs" | "login" };
    };
    /** 제목 아래의 제품 창. 실제 화면의 모양을 컴포넌트로 그린다(스크린숏이 아니다) */
    readonly preview: {
        readonly label: string;
        readonly nav: ReadonlyArray<string>;
        readonly heading: string;
        readonly rows: ReadonlyArray<{ readonly title: string; readonly meta: string; readonly badge?: string }>;
    };
    readonly features: {
        readonly title: string;
        readonly lead: string;
        /** 첫 칸은 넓게 서고 제품 창의 줄을 다시 보인다 */
        readonly items: ReadonlyArray<{ readonly icon: IconComponent; readonly title: string; readonly body: string }>;
    };
    readonly steps: {
        readonly title: string;
        readonly items: ReadonlyArray<{ readonly title: string; readonly body: string }>;
    };
    readonly faq: {
        readonly title: string;
        readonly items: ReadonlyArray<{ readonly question: string; readonly answer: string }>;
    };
    readonly closing: {
        readonly title: string;
        readonly lead: string;
        readonly cta: { readonly label: string; readonly href: "docs" | "login" };
    };
}

export const LANDING: LandingContent = {
    hero: {
        title: ["흩어진 팀의 일을", "쪽지 한 장으로"],
        lead: "누가 무엇을 맡았고 어디까지 왔는지 쪽지로 남겨요. 같은 팀은 함께 보고, 나만 볼 것은 비공개로 둬요.",
        primary: { label: "시작하기", href: "docs" },
        secondary: { label: "로그인", href: "login" },
    },
    preview: {
        label: "쪽지 목록 화면",
        nav: ["쪽지", "팀", "내 계정"],
        heading: "쪽지",
        rows: [
            { title: "주간 회의 안건", meta: "배포 일정 정하기" },
            { title: "배포 전 확인할 것", meta: "환경변수 다시 보기", badge: "비공개" },
            { title: "9월 고객 문의 정리", meta: "자주 묻는 것 셋" },
            { title: "다음 분기 목표", meta: "초안을 함께 다듬어요" },
        ],
    },
    features: {
        title: "필요한 만큼만, 단단하게",
        lead: "쪽지 하나에 팀이 함께 일하는 데 필요한 것을 담았어요.",
        items: [
            { icon: FileText, title: "팀이 함께 보는 쪽지", body: "공개 쪽지는 같은 팀 모두에게 보여요. 다른 팀에는 있다는 사실조차 보이지 않아요." },
            { icon: Lock, title: "나만 보는 비공개", body: "비공개 쪽지는 쓴 사람에게만 보여요. 팀의 관리자도 열지 못해요." },
            { icon: Sparkles, title: "한 줄 요약", body: "긴 쪽지는 요약을 눌러 핵심만 먼저 봐요." },
            { icon: Terminal, title: "Claude에서 바로", body: "Claude에 연결하면 대화 안에서 쪽지를 읽고 써요." },
            { icon: Users, title: "초대와 역할", body: "팀원을 초대하고 관리자와 구성원을 나눠요." },
        ],
    },
    steps: {
        title: "세 걸음이면 돼요",
        items: [
            { title: "팀을 초대해요", body: "메일 주소로 팀원을 부르고 역할을 정해요." },
            { title: "쪽지를 써요", body: "맡은 일과 진행 상황을 짧게 남겨요." },
            { title: "Claude에 연결해요", body: "대화하다가 필요한 쪽지를 바로 꺼내 봐요." },
        ],
    },
    faq: {
        title: "자주 묻는 질문",
        items: [
            { question: "누가 내 쪽지를 볼 수 있나요?", answer: "공개 쪽지는 같은 팀이 모두 보고, 비공개 쪽지는 쓴 사람만 봐요." },
            { question: "다 쓴 쪽지는 어떻게 하나요?", answer: "보관하면 목록에서 빠지고 기록으로 남아요. 보관은 쓴 사람만 할 수 있어요." },
            { question: "Claude에 연결하면 무엇을 읽어 가나요?", answer: "연결할 때 허락한 것만 읽어요. 내가 볼 수 있는 쪽지보다 넓게 읽지 않아요." },
        ],
    },
    closing: {
        title: "오늘 할 일부터 쪽지로 남겨 보세요",
        lead: "문서에서 처음 쓰는 법을 3분 안에 볼 수 있어요.",
        cta: { label: "시작하기", href: "docs" },
    },
};
