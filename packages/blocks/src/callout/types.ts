import type { Tone } from "../tone";

export interface CalloutAction
{
    readonly label: string;
    readonly onPress: () => void;
}

export interface CalloutProps
{
    /** 비우면 info. StatusBadge 와 같은 tone 이름을 쓴다 */
    readonly tone?: Tone;
    readonly title: string;
    readonly description?: string;
    /** 오른쪽 위 버튼 하나. 배너는 액션을 하나만 갖는다 */
    readonly action?: CalloutAction;
    /** 주면 닫기 버튼이 붙는다. 닫은 뒤 감추는 것은 호출부 몫이다 */
    readonly onDismiss?: () => void;
    readonly labels?: Partial<CalloutLabels>;
    readonly className?: string;
}

export interface CalloutLabels
{
    readonly dismiss: string;
}
