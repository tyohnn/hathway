export interface TagInputProps
{
    readonly value: ReadonlyArray<string>;
    readonly onValueChange: (value: ReadonlyArray<string>) => void;
    readonly placeholder?: string;
    /** 낭독기용 이름. 비우면 placeholder, 그것도 없으면 기본 문구를 쓴다 — 칩이 있으면 placeholder 가 사라지기 때문이다 */
    readonly label?: string;
    /** 넣을 수 있는 개수 상한 */
    readonly max?: number;
    readonly size?: "default" | "sm";
    readonly disabled?: boolean;
    /** 오류 문구를 돌려주면 넣지 않는다. null 이면 통과 */
    readonly validate?: (text: string) => string | null;
    readonly labels?: Partial<TagInputLabels>;
    readonly className?: string;
}

export interface TagInputLabels
{
    readonly input: string;
    readonly remove: (tag: string) => string;
    readonly duplicate: (tag: string) => string;
    readonly overflow: (max: number) => string;
}
