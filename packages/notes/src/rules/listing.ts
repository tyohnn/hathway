import type { Note } from "../domain/Note.ts";
import type { NotePage, NoteQuery } from "../domain/NoteQuery.ts";

/**
 * 쪽지 목록의 주소와 화면. 주소는 사람이 손으로 고칠 수 있는 입력이라 질의로 바꾸기 전에 여기서 다듬는다.
 *
 * ⚠ **주소가 목록의 상태다.** 찾는 말과 쪽 번호를 화면 안에 들고 있지 않는다. 새로 고쳐도, 링크를 남에게 보내도 같은 목록이 선다.
 */
export const PAGE_SIZE = 20;

/** 찾는 말의 한도. 글자 수로 센다 */
export const QUERY_MAX = 100;

/** Next 의 `searchParams` 와 같은 모양이다. 같은 이름이 여러 번 오면 배열이다 */
export type ListingParams = Readonly<Record<string, string | ReadonlyArray<string> | undefined>>;

const first = (value: string | ReadonlyArray<string> | undefined): string =>
    (typeof value === "string" ? value : value?.[0]) ?? "";

export const noteQueryFrom = (params: ListingParams): NoteQuery =>
{
    const q = Array.from(first(params.q).trim()).slice(0, QUERY_MAX).join("");
    const raw = first(params.page);
    const page = /^\d+$/.test(raw) && Number(raw) >= 1 && Number.isSafeInteger(Number(raw)) ? Number(raw) : 1;

    return { q, page, pageSize: PAGE_SIZE };
};

/**
 * 목록 한 쪽이 무엇을 그리는가. 빈 상태는 셋이고 섞지 않는다(`/ia-design` 의 대시보드 해부도 4번).
 *
 * - `none-yet`: 거름 없이 하나도 없다. 무엇을 담는 자리인지와 쓰기 단추를 세운다.
 * - `no-match`: 거름에 맞는 것이 없거나(`filter`) 쪽 번호가 끝을 넘었다(`past-end`). `back` 이 돌아갈 질의다.
 * - 볼 수 있는 것이 없는 사람에게도 `none-yet` 이 선다. 총수가 볼 수 있는 것만 세므로(INV-NOTE-02) 따로 가를 것이 없고,
 *   그래서 남의 쪽지가 있다는 사실이 화면에 드러나지 않는다.
 */
export type Listing =
    | { readonly kind: "none-yet" }
    | { readonly kind: "no-match"; readonly reason: "filter" | "past-end"; readonly back: NoteQuery }
    | {
        readonly kind: "rows";
        readonly notes: ReadonlyArray<Note>;
        /** 이 쪽의 첫 줄과 끝 줄이 몇 번째인가. 1 에서 센다 */
        readonly from: number;
        readonly to: number;
        readonly total: number;
        /** 앞뒤 쪽의 질의. 없으면 `null` 이고 그 단추가 서지 않는다 */
        readonly previous: NoteQuery | null;
        readonly next: NoteQuery | null;
    };

export const planListing = (query: NoteQuery, { notes, total }: NotePage): Listing =>
{
    if (notes.length === 0)
    {
        if (total > 0)
        {
            return { kind: "no-match", reason: "past-end", back: { ...query, page: 1 } };
        }

        return query.q === "" ? { kind: "none-yet" } : { kind: "no-match", reason: "filter", back: { ...query, q: "", page: 1 } };
    }

    const from = (query.page - 1) * query.pageSize + 1;
    const to = from + notes.length - 1;

    return {
        kind: "rows",
        notes,
        from,
        to,
        total,
        previous: query.page > 1 ? { ...query, page: query.page - 1 } : null,
        next: to < total ? { ...query, page: query.page + 1 } : null,
    };
};
