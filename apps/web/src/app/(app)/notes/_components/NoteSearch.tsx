import Form from "next/form";

import type { ListingParams } from "@hathway/notes/rules/listing";
import { noteQueryFrom, QUERY_MAX } from "@hathway/notes/rules/listing";
import { Button } from "@hathway/ui/components/button";
import { Input } from "@hathway/ui/components/input";

import { paths } from "@/lib/paths";

/** 찾는 칸을 주소의 찾는 말로 채운다. 주소를 읽으므로 제 `<Suspense>` 안에 선다 */
export async function NoteSearchFromParams({ searchParams }: { readonly searchParams: Promise<ListingParams> })
{
    return <NoteSearch q={noteQueryFrom(await searchParams).q} />;
}

/**
 * 제목으로 찾는 칸. 보내면 `/notes?q=…` 로 가고 쪽 번호는 처음으로 돌아간다. 상태는 주소 하나에 있다.
 *
 * ⚠ 기다리는 얼굴은 `q={null}` 이다. 같은 칸과 단추가 꺼진 채로 선다.
 * ⚠ `key` 가 찾는 말을 따른다. 조건 지우기로 주소가 바뀌면 칸에 남은 글도 함께 비운다.
 */
export function NoteSearch({ q }: { readonly q: string | null })
{
    return (
        <Form action={paths.notes()} role="search" aria-label="쪽지 찾기" className="flex max-w-md gap-2">
            <Input
                key={q ?? ""}
                type="search"
                name="q"
                defaultValue={q ?? ""}
                disabled={q === null}
                maxLength={QUERY_MAX}
                placeholder="제목으로 찾기"
                aria-label="제목으로 찾기"
            />
            <Button type="submit" variant="outline" disabled={q === null}>찾기</Button>
        </Form>
    );
}
