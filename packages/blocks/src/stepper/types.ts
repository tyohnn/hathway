export type StepStatus = "done" | "current" | "pending" | "error";

export interface Step
{
    readonly id: string;
    readonly label: string;
    readonly description?: string;
    /** 비우면 current 를 기준으로 done · current · pending 이 정해진다 */
    readonly status?: StepStatus;
}

export interface StepperProps
{
    readonly steps: ReadonlyArray<Step>;
    /** 지금 단계의 인덱스(0부터) */
    readonly current: number;
    readonly orientation?: "horizontal" | "vertical";
    /** 주면 끝난 단계만 누를 수 있다. 앞으로 건너뛰는 것은 절차의 뜻을 깨뜨린다 */
    readonly onStepPress?: (step: Step, index: number) => void;
    readonly className?: string;
}
