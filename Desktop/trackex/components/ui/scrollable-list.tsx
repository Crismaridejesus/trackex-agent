import * as React from "react"
import { cn } from "@/lib/utils"

interface ScrollableListProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string
  children: React.ReactNode
}

export const ScrollableList = React.forwardRef<
  HTMLDivElement,
  ScrollableListProps
>(({ children, maxHeight = "max-h-[500px]", className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto", maxHeight, className)}
      {...props}
    >
      {children}
    </div>
  )
})

ScrollableList.displayName = "ScrollableList"
