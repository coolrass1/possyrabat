import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'brass' | 'moss' | 'clay'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    
    const variants = {
      default: "border-transparent bg-[#16291F] text-[#F3ECDD]",
      secondary: "border-transparent bg-[#e8dcc8] text-[#16291F]",
      destructive: "border-transparent bg-[#B5532E] text-white",
      outline: "text-[#16291F] border-[#16291F]",
      brass: "border-transparent bg-[#C79A45] text-[#16291F]",
      moss: "border-transparent bg-[#7C9A5E] text-[#F3ECDD]",
      clay: "border-transparent bg-[#B5532E] text-white",
    }

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
