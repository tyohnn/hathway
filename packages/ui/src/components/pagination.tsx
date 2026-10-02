import * as React from "react"
import { cn } from "cn"

import { Button } from "@investment/ui/components/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "@investment/ui/icons"
import { strings } from "@investment/ui/strings"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label={strings.pagination.label}
      data-slot="pagination"
      className={cn(
        "cn-pagination mx-auto flex w-full justify-center",
        className
      )}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("cn-pagination-content flex items-center", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

function PaginationLink({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      className={cn("cn-pagination-link", className)}
      nativeButton={false}
      render={
        <a
          aria-current={isActive ? "page" : undefined}
          data-slot="pagination-link"
          data-active={isActive}
          {...props}
        />
      }
    />
  )
}

function PaginationPrevious({
  className,
  text,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text ?? strings.pagination.previousLabel}
      size="default"
      className={cn("cn-pagination-previous", className)}
      {...props}
    >
      <ChevronLeft data-icon="inline-start" className="cn-rtl-flip" />
      <span className="cn-pagination-previous-text hidden sm:block">
        {text ?? strings.pagination.previous}
      </span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  text,
  ...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
  return (
    <PaginationLink
      aria-label={text ?? strings.pagination.nextLabel}
      size="default"
      className={cn("cn-pagination-next", className)}
      {...props}
    >
      <span className="cn-pagination-next-text hidden sm:block">
        {text ?? strings.pagination.next}
      </span>
      <ChevronRight data-icon="inline-end" className="cn-rtl-flip" />
    </PaginationLink>
  )
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn(
        "cn-pagination-ellipsis flex items-center justify-center",
        className
      )}
      {...props}
    >
      <MoreHorizontal />
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
