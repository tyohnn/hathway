/**
 * 업로드 게이트의 순수 규칙. 화면을 모르므로 vitest 로 검증한다.
 *
 * 코드 allowlist 는 2차 방어선이고 저장 게이트의 정본은 Storage 버킷이다.
 * 여기서 거르는 이유는 화면이 받아 놓고 저장이 415 로 실패하는 구간을 없애려는 것이다.
 */
export type RejectReason = "type" | "size";

export interface FileLike
{
    readonly name: string;
    readonly type: string;
    readonly size: number;
}

export interface RejectedFile<F extends FileLike = FileLike>
{
    readonly file: F;
    readonly reason: RejectReason;
}

export interface PartitionResult<F extends FileLike = FileLike>
{
    readonly accepted: ReadonlyArray<F>;
    readonly rejected: ReadonlyArray<RejectedFile<F>>;
}

/** `accept` 는 input 과 같은 문자열이다 — `.pdf,image/*,application/x-hwp` */
export function isAcceptedType(file: FileLike, accept?: string): boolean
{
    if (accept === undefined || accept.trim() === "")
    {
        return true;
    }

    const patterns = accept.split(",").map((part) => part.trim().toLowerCase()).filter((part) => part !== "");
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    return patterns.some((pattern) =>
    {
        if (pattern.startsWith("."))
        {
            return name.endsWith(pattern);
        }

        if (pattern.endsWith("/*"))
        {
            return type.startsWith(pattern.slice(0, -1));
        }

        return type === pattern;
    });
}

export function partitionFiles<F extends FileLike>(
    files: ReadonlyArray<F>,
    options: Readonly<{ accept?: string; maxBytes?: number }> = {},
): PartitionResult<F>
{
    const accepted: F[] = [];
    const rejected: RejectedFile<F>[] = [];

    for (const file of files)
    {
        if (!isAcceptedType(file, options.accept))
        {
            rejected.push({ file, reason: "type" });
            continue;
        }

        if (options.maxBytes !== undefined && file.size > options.maxBytes)
        {
            rejected.push({ file, reason: "size" });
            continue;
        }

        accepted.push(file);
    }

    return { accepted, rejected };
}
