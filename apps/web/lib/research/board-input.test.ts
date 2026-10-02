import { describe, expect, it } from 'vitest';
import { parseBoardInput, parseCreateInput, parseDeleteInput } from './board-input';
import { RESEARCH_BOARDS } from './catalog';
import { emptyBoard } from './document';
import type { ResearchBoard, ResearchGroup, ResearchWidget } from './types';

function widget(patch: Partial<ResearchWidget> = {}): ResearchWidget {
  return {
    id: 'w1',
    kind: 'note',
    title: '노트',
    layout: { i: 'w1', x: 0, y: 0, w: 6, h: 4 },
    body: '',
    ...patch,
  };
}

function group(patch: Partial<ResearchGroup> = {}): ResearchGroup {
  return {
    id: 'g1',
    title: '그룹',
    summary: '',
    layout: { i: 'g1', x: 0, y: 0, w: 6, h: 8 },
    widgets: [widget()],
    ...patch,
  };
}

function board(patch: Record<string, unknown> = {}): unknown {
  return { slug: 'board-1', title: '보드', tagline: '', theme: 'stocks', groups: [group()], ...patch };
}

function parsed(input: unknown): ResearchBoard {
  const result = parseBoardInput(input);
  if (!result.ok) throw new Error(result.error);
  return result.board;
}

describe('리서치 보드 저장 입력', () => {
  it('시드 보드는 그대로 통과한다. 지금 저장된 보드가 저장되지 않으면 고칠 수 없다', () => {
    for (const seed of RESEARCH_BOARDS) {
      expect(parsed(seed)).toEqual(seed);
    }
  });

  it('새로 만든 빈 보드는 그대로 통과한다. 만들자마자 저장이 거절되면 안 된다', () => {
    const fresh = emptyBoard('real-estate');
    expect(parsed(fresh)).toEqual(fresh);
  });

  it('타입에 없는 키는 저장하지 않는다. 문서 칸은 jsonb 라 무엇이든 들어간다', () => {
    const result = parsed(
      board({
        extra: 'x',
        groups: [{ ...group(), extra: 'x', widgets: [{ ...widget(), extra: 'x', layout: { ...widget().layout, extra: 1 } }] }],
      }),
    );
    expect(JSON.stringify(result)).not.toContain('extra');
  });

  it('slug 는 소문자와 숫자와 하이픈 64자까지다. 경로와 삭제 조건에 그대로 들어간다', () => {
    expect(parseBoardInput(board({ slug: 'a'.repeat(64) })).ok).toBe(true);
    expect(parseBoardInput(board({ slug: 'ecopro-bm-industry' })).ok).toBe(true);
    expect(parseBoardInput(board({ slug: 'Board' })).ok).toBe(false);
    expect(parseBoardInput(board({ slug: 'a/b' })).ok).toBe(false);
    expect(parseBoardInput(board({ slug: '' })).ok).toBe(false);
  });

  it('slug 가 65자면 받지 않는다', () => {
    expect(parseBoardInput(board({ slug: 'a'.repeat(65) })).ok).toBe(false);
  });

  it('theme 은 stocks 와 real-estate 뿐이다. revalidatePath 의 경로가 된다', () => {
    expect(parseBoardInput(board({ theme: 'stocks' })).ok).toBe(true);
    expect(parseBoardInput(board({ theme: 'real-estate' })).ok).toBe(true);
    expect(parseBoardInput(board({ theme: '../book' })).ok).toBe(false);
  });

  it('제목은 비어 있어도 받는다. 지우고 다시 쓰는 사이에 자동 저장이 돈다', () => {
    expect(parseBoardInput(board({ title: '' })).ok).toBe(true);
  });

  it('제목은 120자까지 받는다', () => {
    expect(parseBoardInput(board({ title: '가'.repeat(120) })).ok).toBe(true);
  });

  it('제목이 121자면 받지 않는다', () => {
    expect(parseBoardInput(board({ title: '가'.repeat(121) })).ok).toBe(false);
  });

  it('그룹은 50개까지 받는다', () => {
    expect(parseBoardInput(board({ groups: Array.from({ length: 50 }, () => group()) })).ok).toBe(true);
  });

  it('그룹이 51개면 받지 않는다. 보드 하나가 문서 칸을 끝없이 키우지 못한다', () => {
    expect(parseBoardInput(board({ groups: Array.from({ length: 51 }, () => group()) })).ok).toBe(false);
  });

  it('한 그룹의 위젯은 50개까지 받는다', () => {
    const widgets = Array.from({ length: 50 }, () => widget());
    expect(parseBoardInput(board({ groups: [group({ widgets })] })).ok).toBe(true);
  });

  it('한 그룹의 위젯이 51개면 받지 않는다', () => {
    const widgets = Array.from({ length: 51 }, () => widget());
    expect(parseBoardInput(board({ groups: [group({ widgets })] })).ok).toBe(false);
  });

  it('노트 본문은 20000자까지 받는다', () => {
    const widgets = [widget({ body: '가'.repeat(20000) })];
    expect(parseBoardInput(board({ groups: [group({ widgets })] })).ok).toBe(true);
  });

  it('노트 본문이 20001자면 받지 않는다', () => {
    const widgets = [widget({ body: '가'.repeat(20001) })];
    expect(parseBoardInput(board({ groups: [group({ widgets })] })).ok).toBe(false);
  });

  it('배치 값은 0 이상 10000 이하의 정수다. 1e308 같은 값은 캔버스를 깨뜨린다', () => {
    const withLayout = (patch: Record<string, number>) =>
      parseBoardInput(board({ groups: [group({ layout: { ...group().layout, ...patch } })] })).ok;
    expect(withLayout({ y: 0 })).toBe(true);
    expect(withLayout({ y: 10000 })).toBe(true);
    expect(withLayout({ y: 10001 })).toBe(false);
    expect(withLayout({ y: -1 })).toBe(false);
    expect(withLayout({ w: 1.5 })).toBe(false);
    expect(withLayout({ h: 1e308 })).toBe(false);
    expect(withLayout({ maxH: 1e308 })).toBe(false);
  });

  it('위젯 종류가 다섯 가지 밖이면 받지 않는다', () => {
    for (const kind of ['chart', 'news', 'note', 'metric', 'link'] as const) {
      expect(parseBoardInput(board({ groups: [group({ widgets: [widget({ kind })] })] })).ok).toBe(true);
    }
    const widgets = [{ ...widget(), kind: 'script' }];
    expect(parseBoardInput(board({ groups: [{ ...group(), widgets }] })).ok).toBe(false);
  });

  it('링크는 http 와 https 와 / 로 시작하는 경로만 받는다. 화면이 그 값을 그대로 href 에 넣는다', () => {
    const withHref = (href: string) =>
      parseBoardInput(board({ groups: [group({ widgets: [widget({ kind: 'link', href })] })] })).ok;
    expect(withHref('https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1')).toBe(true);
    expect(withHref('http://example.com')).toBe(true);
    expect(withHref('/stocks/analysis/247540')).toBe(true);
    expect(withHref('mailto:a@example.com')).toBe(false);
    expect(withHref('stocks/analysis')).toBe(false);
  });

  it('javascript: 와 // 로 시작하는 링크는 받지 않는다', () => {
    const withItemHref = (href: string) =>
      parseBoardInput(
        board({ groups: [group({ widgets: [widget({ kind: 'news', items: [{ title: '기사', href }] })] })] }),
      ).ok;
    expect(withItemHref('javascript:alert(1)')).toBe(false);
    expect(withItemHref('//evil.example')).toBe(false);
    expect(withItemHref('/\\evil.example')).toBe(false);
    expect(withItemHref('/book')).toBe(true);
  });

  it('고칠 수 있는 위반은 무엇을 넘었는지 알려 주고, 꼴이 틀린 입력에는 알려 주지 않는다. 화면에서는 꼴이 틀릴 수 없다', () => {
    expect(parseBoardInput(board({ title: '가'.repeat(121) }))).toEqual({
      ok: false,
      error: '제목은 120자까지 쓸 수 있어요.',
    });
    expect(parseBoardInput(board({ slug: 'a/b' }))).toEqual({
      ok: false,
      error: '요청을 처리하지 못했어요. 새로 고친 뒤 다시 해 주세요.',
    });
    expect(parseBoardInput(board({ tagline: 1 }))).toEqual({
      ok: false,
      error: '요청을 처리하지 못했어요. 새로 고친 뒤 다시 해 주세요.',
    });
  });
});

describe('리서치 보드 만들기 · 지우기 입력', () => {
  it('삭제는 slug 꼴이 맞을 때만 받는다', () => {
    expect(parseDeleteInput('ecopro-bm-industry', 'stocks')).toEqual({
      ok: true,
      slug: 'ecopro-bm-industry',
      theme: 'stocks',
    });
    expect(parseDeleteInput('a,b', 'stocks').ok).toBe(false);
    expect(parseDeleteInput({ like: '%' }, 'stocks').ok).toBe(false);
    expect(parseDeleteInput('board-1', '../book').ok).toBe(false);
  });

  it("새 보드의 제목이 없으면 '새 보드' 로 만든다", () => {
    expect(parseCreateInput('stocks', undefined)).toEqual({ ok: true, theme: 'stocks', title: '새 보드' });
    expect(parseCreateInput('real-estate', '금리')).toEqual({ ok: true, theme: 'real-estate', title: '금리' });
    expect(parseCreateInput('stocks', '가'.repeat(121)).ok).toBe(false);
    expect(parseCreateInput('lab', undefined).ok).toBe(false);
  });
});
