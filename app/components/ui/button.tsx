import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'brass' | 'moss' | 'clay'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer duration-200"
    
    const variants = {
      default: "bg-[#C79A45] text-[#16291F] hover:bg-[#b08432] shadow-sm active:scale-95",
      brass: "bg-[#C79A45] text-[#16291F] hover:bg-[#b08432] shadow-sm active:scale-95",
      moss: "bg-[#7C9A5E] text-[#16291F] hover:bg-[#68824f] shadow-sm active:scale-95 text-[#F3ECDD]",
      clay: "bg-[#B5532E] text-white hover:bg-[#9c4220] shadow-sm active:scale-95",
      destructive: "bg-[#B5532E] text-white hover:bg-[#9c4220] active:scale-95",
      outline: "border border-[#C79A45] text-[#C79A45] hover:bg-[#C79A45] hover:text-[#16291F]",
      secondary: "bg-[#e8dcc8] text-[#16291F] hover:bg-[#d6c7b0]",
      ghost: "hover:bg-[#16291F]/10 hover:text-[#16291F]",
      link: "text-[#C79A45] underline-offset-4 hover:underline",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
