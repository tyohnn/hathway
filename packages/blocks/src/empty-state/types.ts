import type React from "react";

/**
 * 아무것도 없는 자리.
 *
 * ⚠ **문구를 `labels` 로 받지 않는다.** 다른 블록과 다른 자리다 — 여기 서는 글은 전부 호출부의 것이고
 *    블록이 기본값으로 가질 만한 말이 하나도 없다. 「비어 있습니다」를 기본값으로 두면 그 말이 화면마다
 *    그대로 서서, 무엇이 비었는지도 다음에 무엇을 하면 되는지도 말하지 않는 자리가 된다.
 *
 * ⚠ **제목은 사실을 적고 설명은 다음 걸음을 적는다.** 「등록된 에이전트가 없습니다」가 제목이고
 *    「새 에이전트를 만들어 시작하세요」가 설명이다. 둘을 한 줄로 합치면 읽는 사람이 자기가 무엇을 해야
 *    하는지를 문장에서 골라내야 한다.
 */
export interface EmptyStateProps
{
    readonly title: string;

    readonly description?: React.ReactNode;

    /** 아이콘 하나. 비우면 그 자리가 서지 않는다 */
    readonly media?: React.ReactNode;

    /** 다음 걸음을 여는 단추. 없으면 두지 않는다 — 누를 것이 없는 화면에 단추를 그리지 않는다 */
    readonly action?: React.ReactNode;

    readonly className?: string;
}
