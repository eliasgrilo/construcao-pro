import { cn } from '@/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <div className="fixed inset-x-0 top-0 z-50 h-[100dvh] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          /* ── Base ── */
          'relative w-full bg-card shadow-2xl shadow-black/15 duration-200 border',
          'focus:outline-none',
          /* ── Mobile: full bottom sheet ── */
          'rounded-t-[16px] rounded-b-none',
          'max-h-[92dvh] overflow-y-auto overscroll-contain',
          'px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          /* ── Animations — slide up ── */
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full',
          /* ── Desktop: centered card ── */
          'sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh] sm:px-6 sm:pt-6 sm:pb-6',
          'sm:data-[state=closed]:slide-out-to-bottom-[0%] sm:data-[state=open]:slide-in-from-bottom-[0%]',
          'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
          className,
        )}
        {...props}
      >
        {/* Mobile drag handle — iOS style */}
        <div className="flex justify-center pt-1.5 pb-4 sm:hidden">
          <div className="w-9 h-[5px] rounded-full bg-muted-foreground/25" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
))
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
      'flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-2',
      /* On mobile, make buttons full-width and larger */
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
