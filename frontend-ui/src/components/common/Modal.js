import { useEffect, useRef } from 'react'

const defaultOverlayClassName =
  'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-6'
const defaultPanelClassName =
  'my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 sm:max-h-[calc(100vh-3rem)]'

const getFocusableElements = (container) =>
  Array.from(
    container?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []
  )

const Modal = ({
  children,
  ariaLabelledBy,
  ariaDescribedBy,
  onClose,
  isDismissible = true,
  closeOnBackdrop = true,
  initialFocusRef,
  overlayClassName = defaultOverlayClassName,
  panelClassName = defaultPanelClassName,
  panelRef,
}) => {
  const internalPanelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const isDismissibleRef = useRef(isDismissible)
  const initialFocusRefRef = useRef(initialFocusRef)

  onCloseRef.current = onClose
  isDismissibleRef.current = isDismissible
  initialFocusRefRef.current = initialFocusRef

  useEffect(() => {
    const previouslyFocusedElement = window.document.activeElement
    const previousBodyOverflow = window.document.body.style.overflow
    window.document.body.style.overflow = 'hidden'
    const focusTarget =
      initialFocusRefRef.current?.current || getFocusableElements(internalPanelRef.current)[0]
    focusTarget?.focus()
    if (!focusTarget) internalPanelRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (isDismissibleRef.current) onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab') return

      const panel = internalPanelRef.current
      const focusableElements = getFocusableElements(panel)
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (!firstElement) {
        event.preventDefault()
        panel?.focus()
      } else if (
        event.shiftKey &&
        (window.document.activeElement === firstElement ||
          window.document.activeElement === initialFocusRefRef.current?.current)
      ) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && window.document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    window.document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
      window.document.body.style.overflow = previousBodyOverflow
      previouslyFocusedElement?.focus()
    }
  }, [])

  return (
    <div
      className={overlayClassName}
      onMouseDown={(event) => {
        if (
          isDismissible &&
          closeOnBackdrop &&
          event.target === event.currentTarget
        ) {
          onClose?.()
        }
      }}
    >
      <section
        ref={(node) => {
          internalPanelRef.current = node
          if (typeof panelRef === 'function') panelRef(node)
          else if (panelRef) panelRef.current = node
        }}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-modal="true"
        className={panelClassName}
        role="dialog"
        tabIndex="-1"
      >
        {children}
      </section>
    </div>
  )
}

export default Modal
