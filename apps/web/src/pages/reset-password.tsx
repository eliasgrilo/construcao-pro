import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

const passwordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = passwordSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError
      setSuccess(true)
      // Auto-redirect after 3s (cancelled on unmount)
      redirectTimerRef.current = setTimeout(() => navigate({ to: '/' }), 3000)
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? ''
      const friendly = msg.includes('weak')
        ? 'Senha muito fraca (use letras e números)'
        : msg.includes('expired')
          ? 'Link expirado. Solicite um novo.'
          : 'Erro ao redefinir senha. Tente novamente.'
      setError(friendly)
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
        {success ? (
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
              <h2 className="text-[24px] font-bold tracking-tight">Senha Redefinida</h2>
              <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">
                Sua senha foi atualizada com sucesso. Você será redirecionado automaticamente.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[14px] text-primary font-medium hover:underline"
            >
              Ir para o Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-[28px] font-bold tracking-tight">Redefinir Senha</h2>
              <p className="text-muted-foreground mt-1 text-[15px]">
                Escolha uma nova senha para sua conta.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 text-[15px] pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 text-[15px]"
                />
              </div>

              {/* Password strength hint */}
              <div className="space-y-1.5">
                {[
                  { label: 'Mínimo 6 caracteres', ok: password.length >= 6 },
                  {
                    label: 'Senhas coincidem',
                    ok: password.length > 0 && password === confirmPassword,
                  },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-muted-foreground/30'}`}
                    />
                    <span
                      className={`text-[12px] ${ok ? 'text-success' : 'text-muted-foreground'}`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full h-11 text-[15px]" loading={isSubmitting}>
                <Lock className="h-4 w-4 mr-2" />
                Redefinir Senha
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
