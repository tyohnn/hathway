"use client";

import { Card } from "@investment/ui/components/card";
import { cn } from "@investment/ui/lib/utils";

import type { ChatRailProps } from "./types";

/**
 * 대화 곁에 서는 레일. 진행과 파일과 콘텍스트를 담는다.
 *
 * ⚠ **카드로 뜬다**(2026-09-21 사용자 확정). 기둥으로 붙이면 셸의 가장자리까지 꽉 차서 대화와 같은
 *    무게로 읽힌다. 레일은 곁눈으로 보는 자리라 떠 있어야 하고, 그래야 미리보기가 같은 자리에 들어설
 *    때 둘이 같은 것으로 읽힌다.
 *
 * ⚠ **머리를 두지 않는다.** 「상태」라는 이름을 붙여 기둥으로 세웠더니 대화와 나란한 두 번째 화면이
 *    되었다. 여기 서는 묶음들은 저마다 제 머리를 이미 갖고 있어서, 그 위에 이름을 하나 더 얹으면
 *    무엇을 여는 것인지가 도리어 흐려진다.
 *
 * ⚠ **높이를 꽉 채우지 않는다**(2026-09-22 사용자 확정). 카드가 셸의 위아래에 닿으면 곁눈으로 보는
 *    자리가 아니라 두 번째 기둥으로 읽힌다. 담은 것만큼만 서고, 넘치면 그때 안에서 구른다.
 *
 * ⚠ **너비를 레일이 정하지 않는다**(2026-09-22 사용자 확정). 대화와 이 카드 사이의 손잡이를 끌어
 *    사람이 정하므로 여기는 제 칸을 가득 채우기만 한다. 고정 너비를 들고 있으면 손잡이를 끌어도
 *    카드가 따라오지 않는다.
 */
export function ChatRail({ children, className }: ChatRailProps)
{
    return (
        // ⚠ 높이를 칸에서 받아야 카드의 `max-h-full` 이 잴 것이 생긴다. 없으면 카드가 담은 것만큼 자라
        //    화면 밖으로 나가고, 셸이 화면 높이에 묶여 있으므로 넘친 만큼 잘린다
        <div data-slot="chat-rail" className="flex h-full min-h-0 items-start py-4 pr-4">
            {/*
              * ⚠ **묶음 사이를 24px 로 벌린다**(2026-09-22 사용자 지적). 12px 에서는 한 묶음의 속과
              *    다음 묶음의 머리가 같은 간격으로 붙어 어디서 끊기는지가 보이지 않았다. surface 축의
              *    lg 가 그 값이라 리터럴을 새로 고르지 않는다
              */}
            <Card className={cn("h-auto max-h-full w-full gap-[var(--surface-gap-lg)] overflow-y-auto px-4", className)}>
                {children}
            </Card>
        </div>
    );
}
