import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

const emailSchema = z.string().email('E-mail inválido')

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }

    setIsSubmitting(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px] space-y-6"
      >
        {sent ? (
          <div className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 mx-auto"
            >
              <CheckCircle2 className="h-8 w-8 text-success" />
            </motion.div>
            <div>
              <h2 className="text-[24px] font-bold tracking-tight">E-mail Enviado</h2>
              <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
                Se existe uma conta com <strong>{email}</strong>, você receberá um link para
                redefinir sua senha.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Verifique também a pasta de spam ou lixo eletrônico.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-[14px] text-primary font-medium hover:underline mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-[28px] font-bold tracking-tight">Esqueceu a senha?</h2>
              <p className="text-muted-foreground mt-1 text-[15px]">
                Informe seu e-mail e enviaremos instruções para redefinir sua senha.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 text-[15px]"
                />
              </div>

              <Button type="submit" className="w-full h-11 text-[15px]" loading={isSubmitting}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Link de Redefinição
              </Button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
