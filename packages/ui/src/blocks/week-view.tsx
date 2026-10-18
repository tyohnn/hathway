import { MapPin } from "@hathway/ui/icons";

import { CAPTION } from "@hathway/ui/blocks/lib/copy";
import { pendingFrame } from "@hathway/ui/blocks/pending";
import { cn } from "@hathway/ui/lib/utils";
import { strings } from "@hathway/ui/strings";

export type WeekTone = "primary" | "success" | "info" | "warning";

export type WeekDay = { name: string; date: number | string; today?: boolean };

/** `day` is the index of the event's column; `start` and `end` are hours from midnight (9.5 is 09:30) */
export type WeekEvent = { day: number; start: number; end: number; title: string; place?: string; tone?: WeekTone };

/** `from` and `to` are the indexes of the first and the last day the event covers */
export type WeekAllDayEvent = { from: number; to: number; title: string; tone?: WeekTone };

// An event is a soft fill in its calendar's colour: the system's soft status colours, or a tint of primary.
const TONE: Record<WeekTone, string> = {
    primary: "bg-[color-mix(in_oklab,var(--primary)_12%,var(--background))]",
    success: "bg-[color:var(--success-soft)]",
    info: "bg-[color:var(--info-soft)]",
    warning: "bg-[color:var(--warning-soft)]",
};

const EVENT = "rounded-[min(var(--control-radius),8px)] text-[length:var(--ui-text-xs)] leading-[var(--ui-line-height-xs)] text-foreground";

const GUTTER_LABEL = cn(CAPTION, "self-center ps-1 pe-2 text-right whitespace-nowrap");

const clock = (hours: number) => `${String(Math.floor(hours)).padStart(2, "0")}:${String(Math.round((hours % 1) * 60)).padStart(2, "0")}`;

/**
 * A week of a calendar: the day headings with today marked, a row of all-day events, and the hour grid with the
 * events placed by their start and end and a line at the current time. It fills the height it is given; the grid
 * keeps a least height and scrolls inside. Days, hours and events are the caller's — a work week is five days,
 * a day view is one. The geometry (an event's top and height as a share of the hours on show, the hour lines)
 * is the view's own; the colours, the type and the event radius are the system's. `loading` keeps the day headings,
 * the gutter and the hour grid and draws no events; the all-day row keeps the height of one event, and the "now"
 * line is drawn when the caller passes it.
 */
export const WeekView = ({
    days,
    hours,
    events,
    allDay,
    allDayLabel = strings.blocks.calendar.allDay,
    zoneLabel,
    now,
    formatTime = clock,
    loading,
    className,
}: {
    days: readonly WeekDay[];
    /** The hours on show, from midnight: `{ start: 8, end: 18 }` */
    hours: { start: number; end: number };
    events?: readonly WeekEvent[];
    allDay?: readonly WeekAllDayEvent[];
    /** The gutter label of the all-day row */
    allDayLabel?: string;
    /** The gutter label over the hours: the time zone */
    zoneLabel?: string;
    /** The current time in today's column, with its name for assistive technology ("Now, 11:45") */
    now?: { at: number; label?: string };
    /** How an hour is written on the axis and in an event; 24-hour `HH:MM` when left out */
    formatTime?: (hours: number) => string;
    loading?: boolean;
    className?: string;
}) =>
{
    const span = hours.end - hours.start;
    const percent = (at: number) => `${((at - hours.start) / span) * 100}%`;
    const shown = loading || events === undefined ? [] : events;
    const columns = { gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` };

    return (
        <div {...pendingFrame(loading)} className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", className)}>
            <div className="grid border-b border-border" style={columns}>
                <span className={GUTTER_LABEL}>{zoneLabel}</span>
                {days.map((day) => (
                    <div key={day.date} className="flex items-center justify-center gap-2 border-l border-border py-2">
                        <span className={cn("text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)]", day.today ? "text-primary" : "text-muted-foreground")}>{day.name}</span>
                        <span className={cn("flex h-7 min-w-7 items-center justify-center rounded-full text-[length:var(--ui-text-md)] font-semibold", day.today ? "bg-primary text-primary-foreground" : "text-foreground")}>{day.date}</span>
                    </div>
                ))}
            </div>
            {allDay !== undefined && (
                <div className="grid border-b border-border" style={columns}>
                    <span className={GUTTER_LABEL}>{allDayLabel}</span>
                    <div className="col-[2/-1] grid gap-1 px-1 py-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {/* The row is as tall as one event while there are none to draw */}
                        {loading && <div aria-hidden className={cn(EVENT, "invisible px-2 py-0.5 font-medium")}>&nbsp;</div>}
                        {!loading && allDay.map((event) => (
                            <div
                                key={`${event.title}-${event.from}`}
                                className={cn(EVENT, TONE[event.tone ?? "primary"], "truncate px-2 py-0.5 font-medium")}
                                style={{ gridColumn: `${event.from + 1} / ${event.to + 2}` }}
                            >
                                {event.title}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="grid min-h-[34rem] flex-1" style={columns}>
                <div className="relative my-3">
                    {Array.from({ length: span }, (_, index) => hours.start + index).map((hour) => (
                        <span key={hour} className={cn(CAPTION, "absolute right-2 -translate-y-1/2")} style={{ top: percent(hour) }}>{formatTime(hour)}</span>
                    ))}
                </div>
                {days.map((day, index) => (
                    <div
                        key={day.date}
                        className={cn(
                            "relative my-3 border-l border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] shadow-[0_1px_0_var(--border)]",
                            day.today && "bg-[color-mix(in_oklab,var(--primary)_4%,transparent)]",
                        )}
                        style={{ backgroundSize: `100% calc(100% / ${span})` }}
                    >
                        {shown.filter((event) => event.day === index).map((event) =>
                        {
                            const duration = event.end - event.start;
                            const short = duration < 0.75;

                            return (
                                <div
                                    key={`${event.title}-${event.start}`}
                                    className={cn(EVENT, TONE[event.tone ?? "primary"], "absolute right-[4px] left-[3px] flex flex-col gap-[1px] overflow-hidden px-[6px]", short ? "justify-center py-0" : "py-[3px]")}
                                    style={{ top: percent(event.start), height: `calc(${percent(event.end + hours.start - event.start)} - 2px)` }}
                                >
                                    <span className="truncate font-semibold">{event.title}</span>
                                    {!short && <span className="truncate text-muted-foreground">{formatTime(event.start)} – {formatTime(event.end)}</span>}
                                    {duration >= 1 && event.place && (
                                        <span className="flex min-w-0 items-center gap-1 text-muted-foreground [&_svg]:size-[var(--control-icon-size-sm)] [&_svg]:shrink-0">
                                            <MapPin />
                                            <span className="truncate">{event.place}</span>
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {day.today && now !== undefined && (
                            <div
                                className="absolute right-0 left-0 z-[1] h-[2px] bg-destructive before:absolute before:top-[-3px] before:left-[-4px] before:size-[8px] before:rounded-full before:bg-destructive before:content-['']"
                                style={{ top: percent(now.at) }}
                                aria-label={now.label ?? strings.blocks.calendar.now}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
