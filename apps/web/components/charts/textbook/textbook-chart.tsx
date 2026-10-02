'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@investment/ui/components/card';
import { cn } from '@/lib/cn';
import { getTextbookChart } from './registry';
// Registers every chapter module as a side effect. Imported after
// `./registry` (see comments in `./registry.ts` and `./data/index.ts`) so
// registry.ts's module-scope Map is initialized before any chapter module
// calls `registerTextbookCharts`.
import './data';

export function TextbookChart({ id }: { id: string }) {
  const spec = getTextbookChart(id);

  if (!spec) {
    if (process.env.NODE_ENV === 'production') return null;
    return (
      <div
        role="alert"
        className="my-6 w-full rounded-lg border-2 border-dashed border-destructive bg-destructive-soft p-4 text-sm text-destructive"
      >
        <strong className="font-semibold">TextbookChart: unknown id</strong>{' '}
        <code className="rounded bg-destructive-soft px-1 py-0.5">{id}</code>
        <p className="mt-1 text-destructive">
          `registry.ts`에 등록되지 않았습니다. 챕터 데이터 모듈에서
          `registerTextbookCharts`를 호출했는지, `data/index.ts`가 그 모듈을
          import하는지 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <Card className="my-6 w-full">
      <CardHeader>
        <CardTitle>{spec.title}</CardTitle>
        {spec.description ? <CardDescription>{spec.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <div className={cn('min-h-[240px] w-full')}>{spec.render()}</div>
        <p className="mt-3 text-xs text-muted-foreground">{spec.source}</p>
      </CardContent>
    </Card>
  );
}
