import { llmsText } from "@/lib/discovery";
import { SITE_URL } from "@/lib/site";
import { SITE_INDEX } from "@/lib/siteIndex";

/** `/llms.txt`. AI 가 이 서비스를 한 번에 파악하도록 이름 · 한 줄 설명 · 읽을 글의 목록을 마크다운으로 낸다(https://llmstxt.org) */
export function GET(): Response
{
    return new Response(llmsText(SITE_URL, SITE_INDEX), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
