import { redirect } from "next/navigation";

import { DOCS } from "@/content/docs";
import { paths } from "@/lib/paths";

/** 문서의 뿌리는 첫 문서로 보낸다. 목차만 있는 빈 화면을 두지 않는다 */
export default function DocsIndex()
{
    redirect(paths.docs(DOCS[0]?.slug ?? ""));
}
