/**
 * 개인정보 처리방침과 이용약관이 함께 쓰는 사실. 두 글(`privacy.mdx` · `terms.mdx`)은 운영자와 연락처를 여기서만 읽는다.
 *
 * ⚠ **대괄호 값은 자리표시다.** 그대로 두면 화면에 대괄호가 선다. 제품을 세우면 사업자등록증의 값으로 바꾼다.
 *    보호책임자를 따로 정하지 않으면 대표자가 맡는다(개인정보 보호법 제31조 제2항). 문의 이메일은 Google OAuth 동의 화면의
 *    지원 이메일과 같은 값으로 둔다. 브랜딩 인증이 둘을 견준다.
 * ⚠ 글은 이 스캐폴드가 실제로 다루는 데이터대로 썼다. 예시 도메인(쪽지)을 걷거나 제품의 객체를 더하면 두 글도 함께 고친다.
 *    모듈이 맡는 문단에는 `scaffold:module <이름>` 표시가 있어서 모듈을 떼면 그 문단도 빠진다.
 * ⚠ 글을 고치면 `effectiveOn` 을 시행할 날로 바꾸고, 시행 7일 전에 알린다. 사람에게 불리한 변경이면 30일 전에 알린다(약관 「약관의 게시와 변경」).
 */
export const LEGAL = {
    service: "Hathway",
    /** Google 계정 정보 절의 영어 문단이 쓴다. 화면 이름이 한국어면 영어 이름으로 바꾼다 */
    serviceEnglish: "Hathway",
    operator: "[상호]",
    representative: "[대표자]",
    businessNumber: "[사업자등록번호]",
    address: "[사업장 주소]",
    contact: "[문의 이메일]",
    phone: "[대표 전화]",
    privacyOfficer: "[이름(직책)]",
    /** 데이터를 두는 곳. 두 앱의 `vercel.json` 에 적은 `regions` 와 Supabase 프로젝트의 리전을 따른다 */
    region: "서울",
    regionEnglish: "Seoul",
    effectiveOn: "2026-10-17",
} as const;
