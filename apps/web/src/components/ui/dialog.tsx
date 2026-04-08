import { useBodyScrollLock, useOverlayPresence } from '@/hooks/use-body-scroll-lock'
import { cn } from '@/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as React from 'react'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />
}

const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, onClick, ...props }, ref) => {
  // Move scroll lock here so it persists during Framer Space/Radix exit animations,
  // preventing the background from jumping (empurrar a tela) before modal leaves.
  useBodyScrollLock(true)
  useOverlayPresence(true)

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      onClick={(e) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      onClick?.(e)
    }}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      'data-[state=closed]:pointer-events-none',
      className,
    )}
    {...props}
  />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      {/*
        With interactive-widget=resizes-content, the layout viewport shrinks
        when the keyboard opens. position:fixed;inset:0 automatically covers
        only the visible area (above keyboard). overflow-hidden prevents translate out of bounds jank.
      */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            /* ── Base ── */
            'pointer-events-auto',
            'relative w-full bg-card shadow-2xl shadow-black/15 border',
            'focus:outline-none',
            /* ── Mobile: full bottom sheet ── */
            'rounded-t-[16px] rounded-b-none',
            'max-h-[min(92%,calc(100dvh-env(safe-area-inset-top)-1rem))]',
            'max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))]',
            'overflow-x-hidden overflow-y-auto overscroll-contain',
            'px-5 pt-3 pb-[var(--modal-pb,max(1.25rem,env(safe-area-inset-bottom)))]',
            /*
              ── ANIMATIONS ──
              Mobile: Apple-style modal behavior with spring deceleration.
            */
            'max-sm:data-[state=open]:animate-in max-sm:data-[state=closed]:animate-out',
            'max-sm:data-[state=closed]:fade-out-0 max-sm:data-[state=open]:fade-in-0',
            'max-sm:data-[state=closed]:[animation:modalExit_0.22s_cubic-bezier(0.4,0,1,1)_forwards]',
            'max-sm:data-[state=open]:[animation:modalEnter_0.38s_cubic-bezier(0.32,0.72,0,1)_forwards]',
            /* ── Desktop: centered card ── */
            'sm:data-[state=open]:animate-in sm:data-[state=closed]:animate-out',
            'sm:data-[state=closed]:fade-out-0 sm:data-[state=open]:fade-in-0',
            'sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh] sm:px-6 sm:pt-6 sm:pb-6',
            'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
            'sm:data-[state=open]:duration-[260ms] sm:data-[state=closed]:duration-[180ms]',
            'sm:data-[state=open]:[animation-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
            'sm:data-[state=closed]:[animation-timing-function:cubic-bezier(0.4,0,1,1)]',
            className,
          )}
          {...props}
        >
          {/* Mobile drag handle — iOS style */}
          <div className="flex justify-center pt-1.5 pb-4 sm:hidden" aria-hidden="true">
            <div className="w-9 h-[5px] rounded-full bg-muted-foreground/25" />
          </div>
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-1.5 text-center sm:text-left pr-8 mb-5', className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-2',
      '[&>button]:w-full [&>button]:h-12 [&>button]:text-[15px] [&>button]:rounded-xl',
      'sm:[&>button]:w-auto sm:[&>button]:h-9 sm:[&>button]:text-[13px] sm:[&>button]:rounded-lg',
      className,
    )}
    {...props}
  />
)

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-[19px] sm:text-[17px] font-semibold leading-tight tracking-tight',
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[14px] sm:text-[13px] text-muted-foreground leading-relaxed', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
