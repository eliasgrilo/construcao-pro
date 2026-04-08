import type { RealtimeStatus } from '@/stores/realtime-store'
import { AnimatePresence, motion } from 'framer-motion'
import { Wifi, WifiOff } from 'lucide-react'

interface RealtimeStatusBannerProps {
  status: RealtimeStatus
}

export function RealtimeStatusBanner({ status }: RealtimeStatusBannerProps) {
  const visible = status !== 'CONNECTED'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 36, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
          aria-live="polite"
        >
          <div
            className="flex items-center justify-center gap-2 text-[12px] font-medium px-4"
            style={{
              height: 36,
              backgroundColor: status === 'DISCONNECTED' ? '#FF3B3015' : '#FF950015',
              color: status === 'DISCONNECTED' ? '#FF3B30' : '#FF9500',
            }}
          >
            {status === 'DISCONNECTED' ? (
              <WifiOff className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            ) : (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
              >
                <Wifi className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              </motion.div>
            )}
            <span>
              {status === 'DISCONNECTED'
                ? 'Sem conexão — dados podem estar desatualizados'
                : 'Reconectando…'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
