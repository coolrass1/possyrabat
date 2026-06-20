import * as React from "react"
import { cn } from "@/lib/utils"

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-xs font-bold uppercase tracking-wider text-[#7C9A5E] select-none block mb-1.5",
        className
      )}
      {...props}
    />
  )
)
Label.displayName = "Label"

export { Label }
