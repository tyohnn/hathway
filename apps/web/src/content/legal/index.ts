/**
 * 개인정보 처리방침과 이용약관이 함께 쓰는 사실. 두 글(`privacy.mdx` · `terms.mdx`)은 운영자와 연락처를 여기서만 읽는다.
 *
 * 운영자의 사실은 팍스휴마나의 사업자등록 정보를 옮긴 것이고, 통신판매업 신고번호는 공정거래위원회의 사업자 등록현황에서 옮겼다.
 * 보호책임자를 따로 정하지 않아 대표자가 맡는다(개인정보 보호법 제31조 제2항).
 * ⚠ **대표 전화는 자리표시다.** 이 저장소는 공개 저장소라서 번호를 적을지는 사람이 정한다. 그대로 두면 화면에 대괄호가 선다.
 * ⚠ 문의 이메일은 Google OAuth 동의 화면의 지원 이메일과 같은 값으로 둔다. 브랜딩 인증이 둘을 견준다.
 * ⚠ **데이터의 자리.** Vercel 은 `apps/web/vercel.json` 의 `regions: ["icn1"]` 이라 서울이다. Supabase 원격 프로젝트의 리전은
 *    코드에서 읽을 수 없어 서울(ap-northeast-2)로 적었다. 대시보드에서 확인하고, 다르면 `region` 과 처리방침 7절을 함께 고친다.
 * ⚠ 글을 고치면 `effectiveOn` 을 시행할 날로 바꾸고, 시행 7일 전에 알린다. 사람에게 불리한 변경이면 30일 전에 알린다(약관 「약관의 게시와 변경」).
 */
export const LEGAL = {
    service: "Hathway 기업분석",
    /** Google 계정 정보 절의 영어 문단이 쓴다 */
    serviceEnglish: "Hathway",
    operator: "팍스휴마나",
    representative: "연주환",
    businessNumber: "882-02-02063",
    mailOrderNumber: "2025-서울동대문-0957",
    address: "서울특별시 동대문구 약령시로 3, 3층 B02호(제기동, 블루워크 오피스)",
    contact: "contact@paxhumana.io",
    phone: "[대표 전화]",
    privacyOfficer: "연주환(대표)",
    region: "서울",
    regionEnglish: "Seoul",
    effectiveOn: "2026-10-25",
} as const;
