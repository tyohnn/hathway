import { cn } from "@hathway/ui/lib/utils";

const TONE = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive", info: "bg-info" } as const;

/** A coloured dot that marks a state or a category in the system's status colours: `sm` inside a badge, `md` in place of an icon. */
export const ToneDot = ({ tone, size = "md", className }: { tone: keyof typeof TONE; size?: "sm" | "md"; className?: string }) => (
    <span className={cn("rounded-full", size === "sm" ? "size-[6px]" : "size-[8px] shrink-0", TONE[tone], className)} aria-hidden="true" />
);
