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
              "relative z-0 flex h-12 w-full rounded-lg border px-4 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
              "border-neutral-200 bg-white text-neutral-900 caret-neutral-900 placeholder:text-neutral-400 focus:border-amber focus:ring-amber",
              "dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500",
              "scheme-light dark:scheme-dark",
              isPassword && "pr-12",
              error && "border-red-500 focus:ring-red-500",
              className,
              "border-neutral-200 bg-white text-neutral-900 caret-neutral-900 placeholder:text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:caret-white dark:placeholder:text-neutral-500"
            )}
            ref={ref}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((visible) => !visible)}
              className={cn(
                "absolute inset-y-0 right-0 z-20 flex w-12 cursor-pointer items-center justify-center pointer-events-auto transition-colors",
                showPassword ? "text-orange-500" : "text-zinc-500"
              )}
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
