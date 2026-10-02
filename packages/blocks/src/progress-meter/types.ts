import type { Tone } from "../tone";

export interface ProgressMeterProps
{
    /** 끝난 수. 음수는 0 으로, total 을 넘으면 total 로 접는다 */
    readonly value: number;
    /** 전체 수. 0 이면 막대를 그리지 않고 대시만 보인다 */
    readonly total: number;
    /** 막대 위에 붙는 이름. 비우면 수만 보인다 */
    readonly label?: string;
    /** 채운 칸의 색. 비우면 neutral 이고 브랜드 색으로 찬다 */
    readonly tone?: Tone;
    /** sm 은 목록 행 안에 들어가는 크기다 */
    readonly size?: "default" | "sm";
    /** `8 / 9` 표기. 비우면 켜져 있다 */
    readonly showCount?: boolean;
    readonly className?: string;
}
