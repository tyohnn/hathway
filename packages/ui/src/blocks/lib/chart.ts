/** The systems' chart colours in series order: the first series or category takes `--chart-1`, the sixth starts over. */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"] as const;

export const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];
