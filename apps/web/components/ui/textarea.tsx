import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[1rem] border border-edge bg-well px-4 py-3 text-sm font-light text-ink outline-none transition-colors placeholder:text-faint focus-visible:border-sky-deep focus-visible:ring-3 focus-visible:ring-sky-deep/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-clay aria-invalid:ring-3 aria-invalid:ring-clay/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
