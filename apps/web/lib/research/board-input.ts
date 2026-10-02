/**
 * 리서치 보드 서버 액션의 입력 파싱.
 *
 * 서버 액션은 공개 엔드포인트라 인자의 타입은 약속일 뿐이다. 받은 값을 여기서 다시
 * 읽어, 타입에 있는 키만 한도 안에서 남긴다. 한도를 넘는 보드는 잘라 저장하지 않고
 * 통째로 거절한다. 조용히 자르면 쓴 사람이 모르는 사이에 내용이 사라진다.
 */
import { z } from 'zod';
import type { ResearchBoard, ResearchBoardTheme } from './types';

export const BOARD_LIMITS = {
  title: 120,
  tagline: 300,
  summary: 1000,
  body: 20000,
  source: 300,
  href: 2048,
  note: 1000,
  groups: 50,
  widgets: 50,
  items: 50,
  grid: 10000,
} as const;

const INVALID_SHAPE = '요청을 처리하지 못했어요. 새로 고친 뒤 다시 해 주세요.';

// 쓴 사람이 고칠 수 있는 위반에만 문장을 붙인다. 여기 등록된 문장만 화면으로 나간다.
const FIXABLE = new Set<string>();
function say(message: string): string {
  FIXABLE.add(message);
  return message;
}

const idSchema = z.string().min(1).max(64);
const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/);
const themeSchema = z.enum(['stocks', 'real-estate']);
const titleSchema = z
  .string()
  .max(BOARD_LIMITS.title, say(`제목은 ${BOARD_LIMITS.title}자까지 쓸 수 있어요.`));

const gridSchema = z.number().int().min(0).max(BOARD_LIMITS.grid);

const layoutSchema = z.object({
  i: idSchema,
  x: gridSchema,
  y: gridSchema,
  w: gridSchema,
  h: gridSchema,
  minW: gridSchema.optional(),
  minH: gridSchema.optional(),
  maxH: gridSchema.optional(),
});

// 화면이 이 값을 그대로 href 에 넣는다. `//host` 와 `/\host` 는 브라우저가 바깥 주소로 읽는다.
function isSafeHref(value: string): boolean {
  if (/^https?:\/\//i.test(value)) return true;
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
}

const hrefSchema = z
  .string()
  .max(BOARD_LIMITS.href)
  .refine(isSafeHref, say('링크는 https:// 나 / 로 시작해야 해요.'));

const widgetSchema = z.object({
  id: idSchema,
  kind: z.enum(['chart', 'news', 'note', 'metric', 'link']),
  title: titleSchema,
  layout: layoutSchema,
  body: z
    .string()
    .max(BOARD_LIMITS.body, say(`본문은 ${BOARD_LIMITS.body.toLocaleString('ko-KR')}자까지 쓸 수 있어요.`))
    .optional(),
  source: z.string().max(BOARD_LIMITS.source).optional(),
  href: hrefSchema.optional(),
  hrefLabel: z.string().max(BOARD_LIMITS.title).optional(),
  items: z
    .array(
      z.object({
        title: z.string().max(BOARD_LIMITS.source),
        href: hrefSchema.optional(),
        note: z.string().max(BOARD_LIMITS.note).optional(),
      }),
    )
    .max(BOARD_LIMITS.items)
    .optional(),
  metric: z
    .object({
      value: z.string().max(BOARD_LIMITS.title),
      caption: z.string().max(BOARD_LIMITS.source),
    })
    .optional(),
});

const groupSchema = z.object({
  id: idSchema,
  title: titleSchema,
  summary: z.string().max(BOARD_LIMITS.summary),
  layout: layoutSchema,
  widgets: z
    .array(widgetSchema)
    .max(BOARD_LIMITS.widgets, say(`한 그룹에는 칸을 ${BOARD_LIMITS.widgets}개까지 둘 수 있어요.`)),
});

const boardSchema = z.object({
  slug: slugSchema,
  title: titleSchema,
  tagline: z.string().max(BOARD_LIMITS.tagline, say(`설명은 ${BOARD_LIMITS.tagline}자까지 쓸 수 있어요.`)),
  theme: themeSchema,
  relatedStockCode: z.string().max(20).optional(),
  relatedIndustrySlug: z.string().max(100).optional(),
  groups: z
    .array(groupSchema)
    .max(BOARD_LIMITS.groups, say(`그룹은 ${BOARD_LIMITS.groups}개까지 만들 수 있어요.`)),
});

type Rejected = { ok: false; error: string };

// 꼴이 틀린 것은 화면에서 나올 수 없는 입력이라 무엇이 틀렸는지 알려 주지 않는다.
function rejected(error: z.ZodError): Rejected {
  const message = error.issues[0]?.message;
  return { ok: false, error: message && FIXABLE.has(message) ? message : INVALID_SHAPE };
}

export type BoardInputResult = { ok: true; board: ResearchBoard } | Rejected;

export function parseBoardInput(input: unknown): BoardInputResult {
  const result = boardSchema.safeParse(input);
  if (!result.success) return rejected(result.error);
  return { ok: true, board: result.data };
}

export type CreateInputResult = { ok: true; theme: ResearchBoardTheme; title: string } | Rejected;

export function parseCreateInput(theme: unknown, title: unknown): CreateInputResult {
  const result = z
    .object({ theme: themeSchema, title: titleSchema.default('새 보드') })
    .safeParse({ theme, title });
  if (!result.success) return rejected(result.error);
  return { ok: true, ...result.data };
}

export type DeleteInputResult = { ok: true; slug: string; theme: ResearchBoardTheme } | Rejected;

export function parseDeleteInput(slug: unknown, theme: unknown): DeleteInputResult {
  const result = z.object({ slug: slugSchema, theme: themeSchema }).safeParse({ slug, theme });
  if (!result.success) return rejected(result.error);
  return { ok: true, ...result.data };
}
