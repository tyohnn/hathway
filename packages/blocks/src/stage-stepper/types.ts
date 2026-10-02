/**
 * 단계의 상태 다섯.
 *
 * Stepper 의 done · current · pending · error 넷과 다른 축이다. 저기는 「절차를 어디까지
 * 밟았나」를 말하고 여기는 「이 단계가 지금 어떤 처지인가」를 말한다. hold 는 밖의 사정으로
 * 멈춘 것이고 optional 은 이 고객에게만 붙는 곁가지라, 둘 다 진행의 앞뒤로는 설명되지 않는다.
 */
export type StageStepStatus = "done" | "current" | "hold" | "optional" | "todo";

export interface StageStep
{
    readonly id: string;
    readonly label: string;
    /**
     * 단계 번호. 블록이 매기지 않고 호출부가 문자열로 준다.
     * 곁가지가 `외환-2` 처럼 본 줄과 다른 번호 체계를 갖고, 인덱스로 만들면 단계를 다시
     * 번호 매기는 날 화면과 서류의 번호가 조용히 어긋난다.
     */
    readonly no?: string;
    readonly status: StageStepStatus;
    /** 아래 줄로 내려가는 곁가지의 이름. 비우면 본 줄에 선다 */
    readonly track?: string;
}

export interface StageStepperProps
{
    readonly steps: ReadonlyArray<StageStep>;
    readonly onStepPress?: (step: StageStep, index: number) => void;
    /** 색이 무슨 뜻인지 적는 범례. 비우면 켜져 있다 */
    readonly legend?: boolean;
    readonly labels?: Partial<StageStepperLabels>;
    readonly className?: string;
}

export interface StageStepperLabels
{
    readonly done: string;
    readonly current: string;
    readonly optional: string;
    readonly hold: string;
    readonly todo: string;
}
