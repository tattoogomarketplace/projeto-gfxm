import * as React from "react"
import { cn } from "@/lib/utils"
import { TattooMachineLoader } from "@/components/ui/tattoo-machine-loader"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, children, ...props }, ref) => {
    const variants = {
      primary: "bg-orange-500 text-white hover:bg-orange-600 active:scale-95",
      outline: "border border-orange-500 text-orange-500 hover:bg-orange-500/10 active:scale-95",
      ghost: "text-orange-500 hover:bg-orange-500/5 active:scale-95",
    }

    return (
      <button
        className={cn(
          "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-6 py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-orange-500/70 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#121212]",
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
