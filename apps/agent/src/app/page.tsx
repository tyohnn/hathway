import { redirect } from "next/navigation";

import { paths } from "@/lib/paths";

/**
 * 뿌리 주소. 첫 화면(쪽지 목록)으로 보낸다.
 *
 * ⚠ 세션을 여기서 보지 않는다. 로그인하지 않았다면 미들웨어가 첫 화면으로 가는 길에서 잡아 로그인으로
 *    보내고, 그 판정은 셸의 게이트가 한 번 더 한다.
 */
export default function RootPage()
{
    redirect(paths.home());
}
