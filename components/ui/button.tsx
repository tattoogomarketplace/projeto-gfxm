import * as React from "react"
import { cn } from "@/lib/utils"
import { TattooMachineLoader } from "@/components/ui/tattoo-machine-loader"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'success'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, ...props }, ref) => {
    const variants = {
      primary:
        "bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[0_0_18px_rgba(249,115,22,0.35)] hover:from-orange-400 hover:to-orange-600",
      outline:
        "border border-orange-500/70 text-orange-500 hover:bg-orange-500/10 dark:text-orange-400",
      ghost: "text-orange-500 hover:bg-orange-500/10",
      success:
        "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:to-emerald-600",
    }

    return (
      <button
        className={cn(
          "relative inline-flex min-h-11 min-w-11 transform-gpu items-center justify-center rounded-xl px-6 py-3 text-sm font-bold",
          "transition-[transform,background-color,color,box-shadow,border-color] duration-100 ease-out active:scale-[0.97]",
          "disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0a0a0a]",
          variants[variant],
          className
        )}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <TattooMachineLoader compact label="Tatuando" />
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
