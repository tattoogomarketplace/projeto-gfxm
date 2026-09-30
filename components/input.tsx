'use client';

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === "password"
    const resolvedType = isPassword && showPassword ? "text" : type

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-xs font-semibold uppercase tracking-wider text-muted ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={resolvedType}
            className={cn(
              "flex h-12 w-full rounded-lg border border-graphite-200 bg-graphite-50 px-4 py-2 text-sm text-foreground transition-all duration-200 placeholder:text-muted/50 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber disabled:cursor-not-allowed disabled:opacity-50",
              isPassword && "pr-12",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            ref={ref}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-zinc-500 transition-colors hover:text-orange-500"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          ) : null}
        </div>
        {error && (
          <span className="text-[10px] font-medium text-red-500 ml-1">
            {error}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
