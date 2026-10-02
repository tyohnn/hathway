"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "cn"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      // ⚠ cn-separator 를 붙이고 bg-border 를 걷어냈다. 종전에는 3층 클래스가 아예
      // 붙지 않아 .cn-separator 규칙이 죽어 있었고, 사이드바가 cn-sidebar-separator
      // 로 색을 덮으려 해도 유틸리티 레이어의 bg-border 가 이겨서 닿지 못했다.
      // 색은 3층이 정한다 — 일반 구분선은 --border-subtle, 사이드바는 --sidebar-border.
      //
      // ⚠ 두께도 3층이 갖는다(2026-09-10). 종전에는 여기 data-horizontal:h-px 가
      // 있어서 유틸리티 레이어가 base 레이어를 이겼고, separator.css 의 1px 은
      // 값을 바꿔도 화면이 움직이지 않는 자리였다. 방향 분기는 3층이 같은
      // data 속성을 선택자로 읽는다.
      className={cn("cn-separator shrink-0", className)}
      {...props}
    />
  )
}

export { Separator }
