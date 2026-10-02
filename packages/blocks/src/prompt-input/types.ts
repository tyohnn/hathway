import type React from "react";

export interface PromptInputProps
{
    readonly placeholder?: string;

    /** 주면 제어 모드다 */
    readonly value?: string;
    readonly defaultValue?: string;
    readonly onValueChange?: (value: string) => void;

    readonly onSubmit?: () => void;

    /** 파일을 붙이는 단추. 주지 않으면 그 자리가 서지 않는다 */
    readonly onAttach?: () => void;

    /**
     * 칸 전체를 잠근다.
     *
     * 승인을 기다리는 동안처럼 **지금은 말을 실을 수 없는 자리**가 쓴다. 감추지 않고 잠그는 것은,
     * 감추면 칸이 있던 자리가 비어서 화면이 고장 난 것처럼 보이기 때문이다.
     */
    readonly disabled?: boolean;

    /** 칸 아래 왼쪽에 함께 서는 단추들. 도구 고르개처럼 이 자리에만 있는 것을 호출부가 넣는다 */
    readonly tools?: React.ReactNode;

    /** 칸 아래 한 줄. 무엇이 어떻게 되는지 알리는 자리다 */
    readonly hint?: React.ReactNode;

    /** 처음 높이. 비우면 세 줄이다 */
    readonly rows?: number;

    readonly labels?: Partial<PromptInputLabels>;
    readonly className?: string;
}

export interface PromptInputLabels
{
    /**
     * 칸의 이름.
     *
     * ⚠ **자리 글(placeholder)이 이름을 대신하지 못한다.** 글자를 적기 시작하면 사라지고, 화면
     *    낭독기는 그것을 이름으로 읽지 않는 경우가 있다. 칸 위에 라벨을 세우지 않는 짜임이라
     *    이름을 여기서 준다.
     */
    readonly input: string;

    readonly attach: string;
    readonly send: string;
    /** 보내는 열쇠 두 벌. 칸 오른쪽에 그대로 선다 */
    readonly shortcut: readonly [string, string];
}
