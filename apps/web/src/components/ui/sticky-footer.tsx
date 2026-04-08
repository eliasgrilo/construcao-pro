import { useIsKeyboardOpen } from '@/hooks/use-keyboard-open'
import { AnimatePresence, motion } from 'framer-motion'
import type * as React from 'react'

export function StickyFooter({ children }: { children: React.ReactNode }) {
  const isKeyboardOpen = useIsKeyboardOpen()

  return (
    <AnimatePresence initial={false}>
      {!isKeyboardOpen && (
        <motion.div
          key="sticky-footer"
          variants={{
            visible: {
              height: 'auto',
              opacity: 1,
              transition: { duration: 0 },
            },
            hidden: {
              height: 0,
              opacity: 0,
              transition: { duration: 0 },
            },
          }}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="shrink-0 overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
