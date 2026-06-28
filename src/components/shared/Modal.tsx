import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  maxWidth?: number // default 500
  closeOnOverlayClick?: boolean // default true
  zIndex?: number // default 1000
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 500,
  closeOnOverlayClick = true,
  zIndex = 1000,
}: ModalProps) {
  const previousFocus = useRef<HTMLElement | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const scrollYRef = useRef<number>(0)
  const originalPaddingRightRef = useRef<string>('')

  useEffect(() => {
    if (!isOpen) return

    // 1. Save scroll position and calculate scrollbar width
    scrollYRef.current = window.scrollY
    previousFocus.current = document.activeElement as HTMLElement

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    originalPaddingRightRef.current = document.body.style.paddingRight

    // Apply scrollbar compensation to prevent layout shift
    if (scrollbarWidth > 0) {
      const computedPaddingRight = window.getComputedStyle(document.body).paddingRight
      const currentPadding = parseFloat(computedPaddingRight || '0')
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
    }

    // 2. Lock body scroll using the fixed position gold standard (iOS support)
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYRef.current}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'

    // 3. Focus the modal container
    if (modalRef.current) {
      modalRef.current.focus()
    }

    // 4. Keyboard focus trap & escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        )
        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }

        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      // Restore scroll and body styles
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      document.body.style.paddingRight = originalPaddingRightRef.current

      // Restore scroll position
      window.scrollTo(0, scrollYRef.current)

      // Restore focus
      if (previousFocus.current) {
        previousFocus.current.focus()
      }

      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(16px + env(safe-area-inset-top, 0px)) calc(16px + env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) calc(16px + env(safe-area-inset-left, 0px))',
        height: '100dvh',
      }}
      onClick={handleOverlayClick}
      className="animate-fade-in"
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="card-glass"
        style={{
          width: '95%',
          maxWidth,
          padding: 24,
          maxHeight: 'min(90dvh, 90vh)',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'modal-scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            flexShrink: 0,
          }}
        >
          {title ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {title}
            </div>
          ) : (
            <div />
          )}
          {onClose && (
            <button
              className="btn btn-ghost btn-icon-sm"
              onClick={onClose}
              aria-label="Close dialog"
              style={{ flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', outline: 'none' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
