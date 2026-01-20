"use client"

import { useState, useCallback } from "react"

interface Toast {
  id: string
  title: string
  description?: string
  variant?: "default" | "destructive"
}

type ToastFunction = (toast: Omit<Toast, "id">) => void

function removeToastById(toasts: Toast[], id: string) {
  return toasts.filter((t) => t.id !== id)
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast: ToastFunction = useCallback((toastData) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toastData, id }

    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => removeToastById(prev, id))
    }, 5000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    toast,
    dismiss,
    toasts,
  }
}
