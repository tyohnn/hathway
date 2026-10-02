export interface BarAction
{
    readonly id: string;
    readonly label: string;
    /** danger 는 되돌릴 수 없는 것에만 쓴다. 목록의 마지막에 둔다 */
    readonly tone?: "default" | "danger";
    readonly onPress: () => void;
    readonly disabled?: boolean;
}

export interface ActionBarProps
{
    /** 0 이면 아무것도 그리지 않는다 */
    readonly count: number;
    readonly actions: ReadonlyArray<BarAction>;
    /** floating 은 화면 아래에 뜨고 inline 은 목록 위의 띠다 */
    readonly placement?: "floating" | "inline";
    readonly onClear?: () => void;
    /** 액션이 도는 동안 버튼을 잠근다 */
    readonly busy?: boolean;
    readonly labels?: Partial<ActionBarLabels>;
    readonly className?: string;
}

export interface ActionBarLabels
{
    readonly selected: (count: number) => string;
    readonly clear: string;
}
