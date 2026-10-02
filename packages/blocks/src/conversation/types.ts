import type React from "react";

import type { Property } from "../property-list/types";
import type { ToolCall } from "../tool-calls/types";
import type { ConversationLabels } from "./labels";

/**
 * 대화 한 줄.
 *
 * ⚠ **도메인을 모른다.** `said` 는 사람이 한 말이고 `replied` 는 에이전트가 한 말이며 `calls` 는 쓴
 *    도구이고 `approval` 은 사람의 답을 기다리며 멈춰 선 도구다. 그 넷이 어느 도메인의 무엇에서
 *    왔는지는 호출부가 안다.
 *
 * ⚠ **설정형이다.** 조각을 호출부가 직접 배치하게 열지 않는다. 열면 「사람 말은 오른쪽」과
 *    「에이전트 말에는 아바타」가 화면마다 다시 적히고, 한 화면에서 어긋나도 아무도 모른다.
 */
export type ConversationTurn =
    | {
        readonly kind: "said";
        readonly id: string;
        readonly body: React.ReactNode;
    }
    | {
        readonly kind: "replied";
        readonly id: string;
        readonly body: React.ReactNode;
        /** 말풍선 아래 한 줄. 왜 그렇게 답했는지를 밝히는 자리다 */
        readonly note?: React.ReactNode;
    }
    | {
        readonly kind: "calls";
        readonly id: string;
        readonly calls: ReadonlyArray<ToolCall>;
        /** 비우면 블록이 정한다. 멈춰 선 것이 섞여 있으면 펴 둔다 */
        readonly open?: boolean;
    }
    | {
        /**
         * 사람의 답을 기다리며 멈춰 선 도구.
         *
         * ⚠ **대화 안에 선다.** 답을 다른 자리에서 받으면 대화를 읽던 눈이 그 자리를 찾아
         *    헤매고, 답한 뒤에 그 답이 어느 줄에 붙은 것인지도 남지 않는다. 멈춘 자리가 곧
         *    답하는 자리다.
         */
        readonly kind: "approval";
        readonly id: string;
        readonly title: string;
        /** 왜 멈췄는지. 허락의 어휘는 도메인의 것이라 호출부가 적는다 */
        readonly description?: React.ReactNode;
        /** 넣어 부를 값과 읽는 것과 어느 눈으로 읽는가. 사람이 이것을 보고 답한다 */
        readonly items?: ReadonlyArray<Property>;
        readonly onApprove?: () => void;
        readonly onReject?: () => void;
        /** 답을 보내는 중. 두 단추가 함께 잠긴다 */
        readonly pending?: boolean;
    };

export interface ConversationProps
{
    readonly turns: ReadonlyArray<ConversationTurn>;

    readonly labels?: Partial<ConversationLabels>;

    /** 스크롤러 자체. 높이가 정해진 칸 안에서 남은 자리를 채운다 */
    readonly className?: string;
    /**
     * 말이 서는 기둥. 너비와 여백을 여기 준다.
     *
     * ⚠ **너비를 스크롤러에 주지 않는다.** 스크롤러를 좁히면 스크롤바가 글 옆에 붙어 떠 있고, 그 바깥
     *    여백에서는 휠이 먹지 않는다. 스크롤러는 칸 전부를 쓰고 기둥만 좁힌다.
     */
    readonly contentClassName?: string;
}
