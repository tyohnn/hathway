'use server';

import { revalidatePath } from 'next/cache';
import {
  createResearchBoard as insertBoard,
  deleteResearchBoard as removeBoard,
  upsertResearchBoard,
} from '@/lib/platform/research-boards';
import { parseBoardInput, parseCreateInput, parseDeleteInput } from '@/lib/research/board-input';
import { emptyBoard } from '@/lib/research/document';
import type { ResearchBoard, ResearchBoardTheme } from '@/lib/research/types';
import { boardWritesAllowed } from '@/lib/research/write-gate';

/**
 * 이 파일의 export 는 전부 공개 엔드포인트다. 순서를 고정한다:
 * 관문 → 입력 파싱 → 저장 → 캐시 무효화. 인자의 타입은 믿지 않는다.
 */
export type BoardActionResult =
  | { ok: true; board: ResearchBoard }
  | { ok: false; error: string };

type Refused = { ok: false; error: string };

function refuseWrites(): Refused | null {
  const { VERCEL_ENV, NODE_ENV } = process.env;
  if (boardWritesAllowed({ VERCEL_ENV, NODE_ENV })) return null;
  return { ok: false, error: '이 주소에서는 보드를 고칠 수 없어요.' };
}

// DB 오류의 원문에는 테이블과 제약의 이름이 실린다. 기록에만 남긴다.
function failed(label: string, error: unknown, message: string): Refused {
  console.error(`[research_boards] ${label} 실패:`, error);
  return { ok: false, error: message };
}

function revalidateBoard(board: Pick<ResearchBoard, 'theme' | 'slug'>) {
  revalidatePath(`/${board.theme}/boards`);
  revalidatePath(`/${board.theme}/boards/${board.slug}`);
}

export async function createResearchBoardAction(
  theme: ResearchBoardTheme,
  title?: string,
): Promise<BoardActionResult> {
  const refused = refuseWrites();
  if (refused) return refused;
  const input = parseCreateInput(theme, title);
  if (!input.ok) return input;
  try {
    const board = await insertBoard(emptyBoard(input.theme, input.title));
    revalidateBoard(board);
    return { ok: true, board };
  } catch (error) {
    return failed('create', error, '보드를 만들지 못했어요. 잠시 뒤 다시 해 주세요.');
  }
}

export async function saveResearchBoardAction(board: ResearchBoard): Promise<BoardActionResult> {
  const refused = refuseWrites();
  if (refused) return refused;
  const input = parseBoardInput(board);
  if (!input.ok) return input;
  try {
    const saved = await upsertResearchBoard(input.board);
    revalidateBoard(saved);
    return { ok: true, board: saved };
  } catch (error) {
    return failed('save', error, '보드를 저장하지 못했어요. 잠시 뒤 다시 해 주세요.');
  }
}

export async function deleteResearchBoardAction(
  slug: string,
  theme: ResearchBoardTheme,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const refused = refuseWrites();
  if (refused) return refused;
  const input = parseDeleteInput(slug, theme);
  if (!input.ok) return input;
  try {
    await removeBoard(input.slug);
    revalidateBoard(input);
    return { ok: true };
  } catch (error) {
    return failed('delete', error, '보드를 지우지 못했어요. 잠시 뒤 다시 해 주세요.');
  }
}
