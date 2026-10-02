import { ko } from "react-day-picker/locale"

import type { Strings } from "../names"

/** BCP 47 tag for Intl formatting (chart values, calendar months) */
export const locale = "ko-KR"

/** react-day-picker's locale: month and weekday names and the calendar's own labels, with the navigation named plainly */
export const dateLocale = {
  ...ko,
  labels: {
    ...ko.labels,
    labelNav: "달 넘기기",
    labelPrevious: "이전 달",
    labelNext: "다음 달",
    labelWeekNumber: (weekNumber: number) => `${weekNumber}주`,
  },
}

// Screen words follow the Korean UX writing rules the consuming apps use: 해요체 for sentences, verbs on buttons,
// 「닫기」 for stepping back, and the names people already use (메뉴, not 사이드바).
export const strings = {
  close: "닫기",
  loading: "불러오는 중",
  toast: {
    close: "알림 닫기",
  },
  breadcrumb: {
    label: "현재 위치",
  },
  pagination: {
    label: "페이지 이동",
    previous: "이전",
    previousLabel: "이전 페이지",
    next: "다음",
    nextLabel: "다음 페이지",
  },
  carousel: {
    role: "슬라이드 모음",
    slideRole: "슬라이드",
    previous: "이전 슬라이드",
    next: "다음 슬라이드",
  },
  combobox: {
    removeChip: "선택에서 빼기",
  },
  command: {
    title: "검색",
  },
  sidebar: {
    toggle: "메뉴 열고 닫기",
    title: "메뉴",
  },
  messageScroller: {
    toEnd: "맨 아래로 가기",
    toStart: "맨 위로 가기",
  },
  questionnaire: {
    previous: "이전",
    skip: "건너뛰기",
    next: "다음",
    submit: "제출하기",
  },
} satisfies Strings
