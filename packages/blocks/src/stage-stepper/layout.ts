/**
 * 단계 띠의 열 배치. 화면을 모르므로 vitest 로 검증한다.
 *
 * 단계마다 열이 하나씩 있고, 곁가지 트랙은 자기 열에만 칸을 놓는다. 본 줄의 칸은 다음 본 줄
 * 칸이 시작하기 전까지를 먹어서 갈매기가 끊기지 않는다. 빈 자리에 연결선을 깔지 않는 것은
 * 「곁가지도 처음부터 함께 진행 중」으로 읽히는 것을 막기 위해서다.
 */

export interface StageCell
{
    /** 원래 steps 배열에서의 자리 */
    readonly index: number;
    /** 격자의 열 번호. CSS 와 같게 1 부터 센다 */
    readonly column: number;
    readonly span: number;
}

export interface StageTrack
{
    /** 곁가지의 이름. 본 줄은 이름이 없다 */
    readonly name?: string;
    readonly cells: ReadonlyArray<StageCell>;
}

export interface StageLayout
{
    readonly columns: number;
    readonly tracks: ReadonlyArray<StageTrack>;
}

/** 배치가 보는 것은 트랙 이름 하나뿐이라 단계의 나머지 칸을 알 필요가 없다 */
export interface StageLayoutInput
{
    readonly track?: string;
}

export function stageLayout(steps: ReadonlyArray<StageLayoutInput>): StageLayout
{
    const columns = steps.length;
    const baseIndexes: number[] = [];
    const names: string[] = [];
    const byName = new Map<string, StageCell[]>();

    steps.forEach((step, index) =>
    {
        if (step.track === undefined)
        {
            baseIndexes.push(index);

            return;
        }

        if (!byName.has(step.track))
        {
            names.push(step.track);
            byName.set(step.track, []);
        }

        byName.get(step.track)?.push({ index, column: index + 1, span: 1 });
    });

    const baseCells = baseIndexes.map((index, position) =>
    {
        const next = baseIndexes[position + 1] ?? columns;

        return { index, column: index + 1, span: next - index };
    });

    const tracks: StageTrack[] = [];

    if (baseCells.length > 0)
    {
        tracks.push({ cells: baseCells });
    }

    for (const name of names)
    {
        tracks.push({ name, cells: byName.get(name) ?? [] });
    }

    return { columns, tracks };
}
