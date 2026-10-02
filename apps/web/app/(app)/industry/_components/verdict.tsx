import type { Verdict } from '@/lib/industry';

/** 채(sieve) 판정 색. widget-shell 의 TRUST_CLASS 와 같은 톤을 쓴다. */
export const VERDICT_CLASS: Record<Verdict, string> = {
  통과: 'bg-success-soft text-success',
  통과철회: 'bg-warning-soft text-warning',
  판정보류: 'bg-info-soft text-info',
  실패: 'bg-destructive-soft text-destructive',
  범위밖: 'bg-muted text-muted-foreground',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${VERDICT_CLASS[verdict]}`}
    >
      {verdict}
    </span>
  );
}
