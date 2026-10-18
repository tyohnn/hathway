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
  table: {
    scrollRegion: "옆으로 넘겨 보는 표",
  },
  questionnaire: {
    previous: "이전",
    skip: "건너뛰기",
    next: "다음",
    submit: "제출하기",
  },
  blocks: {
    dataTable: {
      selectAll: "모두 선택",
      selectRow: "항목 선택",
    },
    rowMenu: {
      label: "더 보기",
    },
    search: {
      label: "검색",
      submit: "검색",
    },
    calendar: {
      today: "오늘",
      previous: "이전",
      next: "다음",
      views: "보기 방식",
      allDay: "종일",
      now: "지금",
    },
    comments: {
      reply: "답글",
    },
    diff: {
      collapse: "파일 접기",
      expand: "파일 펼치기",
      viewed: "확인함",
      label: "변경 내용",
    },
    kanban: {
      add: "카드 추가하기",
    },
    onThisPage: {
      title: "목차",
    },
    pager: {
      previous: "이전",
      next: "다음",
    },
    prompt: {
      label: "메시지",
      send: "보내기",
    },
    reply: {
      label: "답장",
    },
    parameters: {
      name: "이름",
      type: "타입",
      required: "필수 여부",
      description: "설명",
      requiredBadge: "필수",
      optionalBadge: "선택",
    },
  },
} satisfies Strings
