# SEO · GEO · Search Console · 도메인

스킬: `seo`(기술 SEO), `ai-seo`(AI 검색 · `llms.txt`), `schema`(JSON-LD), `next-best-practices`(Next 파일 규약). scaffold#13 · #14.

## 도메인부터

- 도메인을 일찍 산다. `vercel.app` 은 공유 도메인이라 구글 OAuth 브랜딩이 홈페이지를 계속 거절했고, 메일도 못 보낸다(Resend 는 자기 도메인 필요).
- Vercel 에서 사고 DNS 를 Vercel 에 둔다(hwpilot.com, 연 $11.25). 구매는 사용자 승인과 등록자 정보(우편번호 등)가 필요하다.
- 붙인 뒤: 프로젝트에 붙이기(www → apex 308), Supabase 인증 허용 주소, Search Console Domain 속성(TXT), GCP 브랜딩 주소(홈 · /privacy · /terms)와
  승인된 도메인, 「문제를 해결함」 제출. 이어서 사이트 주소 · Supabase site_url · canonical · sitemap · 매니페스트 · MCP 주소를 한 PR 에서 옮긴다.

## 페이지 쪽

- 뿌리 레이아웃은 noindex, `(site)/layout.tsx` 가 색인과 `metadataBase` 를 연다.
- `robots.ts` · `sitemap.ts` · `llms.txt` · JSON-LD(조직 · 제품 · 글 종류마다) · `app/opengraph-image.tsx`.
  `/opengraph-image` 를 미들웨어 `PUBLIC_PATHS` 에 더한다.
- canonical 은 사이트 주소 설정에서 만든다(손으로 박지 않는다). 목록 페이지는 쿼리 없는 주소를 가리킨다.
- 설명은 문장으로 쓴다. 내용이 얇은 페이지(예: 서식이 붙지 않은 공고)는 noindex 로 두고 sitemap 에서 뺀다.
- 블로그는 `/blog` 아래.

## Search Console

- 소유 확인: Domain 속성은 TXT, URL 접두 속성은 HTML 파일 `public/googlec549dc02cec84015.html`(같은 구글 계정이면 제품끼리 같은 파일).
  이 파일을 미들웨어 matcher 제외에 넣고 **지우지 않는다.**
- Site Verification API 는 꺼져 있어 확인은 사용자가 한다.
- API: 서비스 계정 `gcs-reader@paxhumana-tools.iam.gserviceaccount.com`, 키는 클라우드 환경변수 `GSC_SERVICE_ACCOUNT_JSON_B64`
  (그 뒤에 시작한 세션만 본다). 속성마다 이 메일을 사용자로 더한다.
  스크립트 `/mnt/project-files/tools/gsc/gsc.mjs`: `sites` · `query` · `inspect` · `sitemaps` · `submit`.
- 색인 요청 API 는 없다(Indexing API 는 채용 · 방송 전용).

## 확인

- `curl -I https://<도메인>/<공개 경로>` 가 로그아웃 상태에서 200 인지(307 이면 matcher 를 고친다).
- `public/` 에 새 확장자 파일을 두면 matcher 제외에 더한다.
- sitemap 제출 뒤 오류 0, 며칠 뒤 `inspect` 로 색인 상태.
