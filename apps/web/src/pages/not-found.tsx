import { Button } from '@/components/ui/button'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, Compass } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="text-center max-w-md"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 mx-auto mb-6">
          <Compass className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-[56px] font-bold tracking-tight leading-none">404</h1>
        <p className="text-[17px] text-muted-foreground mt-2 mb-8">
          Página não encontrada. Talvez ela tenha sido movida ou não exista mais.
        </p>
        <Button onClick={() => navigate({ to: '/' })} size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
      </motion.div>
    </div>
  )
}
