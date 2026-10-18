"use client"

import * as React from "react"
import { cn } from "cn"

import { strings } from "@hathway/ui/strings"

// The caption tells its Table which id names it, so the scroll region can take the same name.
const TableCaptionContext = React.createContext<
  ((id: string) => () => void) | null
>(null)

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [scrollable, setScrollable] = React.useState(false)
  const [captionId, setCaptionId] = React.useState<string>()

  // The container scrolls only when the table is wider than its place. While it does, a keyboard
  // has to be able to reach it (WCAG 2.1.1): not every browser focuses a scroll container by itself.
  // It stays out of the tab order otherwise, so a table that fits adds no stop.
  React.useEffect(() => {
    const container = containerRef.current

    if (!container) return

    const measure = () =>
      setScrollable(
        container.scrollWidth > container.clientWidth ||
          container.scrollHeight > container.clientHeight
      )

    measure()

    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(measure)

    observer.observe(container)
    if (container.firstElementChild) observer.observe(container.firstElementChild)

    return () => observer.disconnect()
  }, [])

  const registerCaption = React.useCallback((id: string) => {
    setCaptionId(id)

    return () => setCaptionId((current) => (current === id ? undefined : current))
  }, [])

  // The region is named like the table: its aria-labelledby or aria-label, then its caption,
  // then the default words.
  const labelledBy = props["aria-labelledby"] ?? (props["aria-label"] ? undefined : captionId)
  const label = labelledBy ? undefined : (props["aria-label"] ?? strings.table.scrollRegion)

  return (
    <TableCaptionContext.Provider value={registerCaption}>
      <div
        ref={containerRef}
        data-slot="table-container"
        className="cn-table-container"
        role={scrollable ? "region" : undefined}
        tabIndex={scrollable ? 0 : undefined}
        aria-labelledby={scrollable ? labelledBy : undefined}
        aria-label={scrollable ? label : undefined}
      >
        <table
          data-slot="table"
          className={cn("cn-table", className)}
          {...props}
        />
      </div>
    </TableCaptionContext.Provider>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("cn-table-header", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("cn-table-body", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("cn-table-footer", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("cn-table-row has-aria-expanded:bg-muted/50", className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("cn-table-head", className)}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("cn-table-cell", className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  id: idProp,
  ...props
}: React.ComponentProps<"caption">) {
  const registerCaption = React.useContext(TableCaptionContext)
  const generatedId = React.useId()
  const id = idProp ?? generatedId

  React.useEffect(() => registerCaption?.(id), [registerCaption, id])

  return (
    <caption
      id={id}
      data-slot="table-caption"
      className={cn("cn-table-caption", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
