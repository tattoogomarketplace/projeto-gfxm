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
      primary: "bg-amber text-graphite hover:bg-amber-500 active:scale-95",
      outline: "border border-amber text-amber hover:bg-amber/10 active:scale-95",
      ghost: "text-amber hover:bg-amber/5 active:scale-95",
    }

    return (
      <button
        className={cn(
          "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-6 py-3 text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-graphite",
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
