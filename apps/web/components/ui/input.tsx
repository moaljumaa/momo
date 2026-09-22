import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-full border border-edge bg-well px-4 text-sm font-light text-ink outline-none transition-colors placeholder:text-faint focus-visible:border-sky-deep focus-visible:ring-3 focus-visible:ring-sky-deep/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-clay aria-invalid:ring-3 aria-invalid:ring-clay/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
