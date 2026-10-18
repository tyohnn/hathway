import { jsonLdScript } from "@/lib/discovery";

/**
 * schema.org 구조화 데이터(JSON-LD). 검색 결과와 AI 가 이 화면이 무엇인지(글 · 서비스) 읽는다. 화면에는 아무것도 그리지 않는다.
 * ⚠ 값은 `jsonLdScript` 가 `<` 를 이스케이프한 글이라 `dangerouslySetInnerHTML` 로 넣어도 태그를 닫지 못한다.
 */
export function JsonLd({ data }: { readonly data: unknown })
{
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
