"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Check, Info, Loader2, TriangleAlert, X } from "lucide-react"

// Glyphs sit inside a tinted tile (see `.toaster` in globals.css), like the category icons on list rows.
const glyph = "size-4"

/** App toasts: styled in globals.css to match the cards, icon tiles and pill buttons. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <Check className={glyph} strokeWidth={2.4} />,
        info: <Info className={glyph} strokeWidth={2} />,
        warning: <TriangleAlert className={glyph} strokeWidth={2} />,
        error: <X className={glyph} strokeWidth={2.4} />,
        loading: <Loader2 className={`${glyph} animate-spin`} strokeWidth={2} />,
      }}
      {...props}
    />
  )
}

export { Toaster }
