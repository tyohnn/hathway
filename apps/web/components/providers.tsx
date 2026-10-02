'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { TooltipProvider } from '@investment/ui/components/tooltip';

/**
 * Dark mode. `attribute="class"` matches the `.dark` selector the design system's
 * theme tokens and its `@custom-variant dark` are written against.
 *
 * next-themes injects an inline <script> to avoid a theme flash. React 19 warns
 * about executable <script> tags rendered from client components, so keep a real
 * script on the server and hand the client an inert type instead.
 */
export function Providers({ children }: { children: ReactNode }) {
  const scriptProps =
    typeof window === 'undefined' ? undefined : ({ type: 'application/json' } as const);

  return (
    <ThemeProvider
      attribute="class"
      // graphite 는 어두운 판이 기본인 시스템이다. 고르지 않은 사람에게는 OS 설정과 상관없이 어둡게 연다.
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      scriptProps={scriptProps}
    >
      <TooltipProvider delay={200}>{children}</TooltipProvider>
    </ThemeProvider>
  );
}
