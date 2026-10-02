import type { Tone } from "../tone";

export interface StatusBadgeProps
{
    /** 비우면 neutral */
    readonly tone?: Tone;
    /** 표시 문구. 값 → 문구 대응은 호출부(온톨로지)가 갖는다 */
    readonly label: string;
    /** 왼쪽 점. 색만으로 구분되지 않아야 하는 자리에서 쓴다 */
    readonly dot?: boolean;
    readonly className?: string;
}
