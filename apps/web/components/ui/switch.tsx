"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-8 shrink-0 items-center rounded-full border border-edge bg-well transition-colors outline-none data-[checked]:border-ember data-[checked]:bg-ember disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-3.5 translate-x-0.5 rounded-full bg-sheet transition-transform data-[checked]:translate-x-3.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
