import { cn } from "cn"

import { Loader } from "@hathway/ui/icons"
import { strings } from "@hathway/ui/strings"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader
      data-slot="spinner"
      role="status"
      aria-label={strings.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
