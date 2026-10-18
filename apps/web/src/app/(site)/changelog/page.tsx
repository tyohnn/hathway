import { redirect } from "next/navigation";

import { RELEASES } from "@/content/changelog";
import { newestFirst } from "@/content/collections";
import { paths } from "@/lib/paths";

/** 새 소식의 뿌리는 가장 최근 판으로 보낸다. 지난 판은 그 글 끝의 「지난 소식」에서 연다 */
export default function ChangelogIndex()
{
    redirect(paths.release(newestFirst(RELEASES)[0]?.version ?? ""));
}
