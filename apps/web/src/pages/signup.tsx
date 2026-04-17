import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapAuthError } from '@/lib/auth-errors'
import { type SignupInput, signupSchema } from '@/lib/schemas'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: SignupInput) => {
    try {
      setError('')
      await signup(data.nome, data.email, data.password)
      // Auto-confirm envs: loadProfile ran → isAuthenticated is true → navigate
      // Email-confirm envs: session is null → show inbox prompt
      if (useAuthStore.getState().isAuthenticated) {
        navigate({ to: '/' })
      } else {
        setConfirmedEmail(data.email)
      }
    } catch (err: unknown) {
      setError(mapAuthError(err))
    }
  }

  // ── Email-confirmation success screen ──────────────────────────────────────
  if (confirmedEmail) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-[#1d1d1f]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/80 via-[#5856D6]/70 to-[#AF52DE]/60" />
          <BrandPanel />
        </div>

        <div className="flex flex-1 items-center justify-center p-8 bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[360px] text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-[24px] font-bold tracking-tight">Verifique seu e-mail</h2>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                Enviamos um link de confirmação para{' '}
                <span className="font-medium text-foreground">{confirmedEmail}</span>.
                <br />
                Clique no link para ativar sua conta.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 border border-border/60 p-4 text-[13px] text-muted-foreground leading-relaxed">
              Não encontrou o e-mail? Verifique a pasta de spam ou lixo eletrônico.
            </div>

            <Link
              to="/login"
              className="block text-[13px] text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar para o login
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-[#1d1d1f]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/80 via-[#5856D6]/70 to-[#AF52DE]/60" />
        <BrandPanel />
      </div>

      {/* Right — Form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="w-full max-w-[360px] space-y-6"
        >
          <div>
            <h2 className="text-[28px] font-bold tracking-tight">Criar conta</h2>
            <p className="text-muted-foreground mt-1 text-[15px]">Preencha os dados para começar</p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                {...register('nome')}
                className="h-11 text-[15px]"
              />
              {errors.nome && <p className="text-[12px] text-destructive">{errors.nome.message}</p>}
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
                className="h-11 text-[15px]"
              />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...register('password')}
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
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  className="h-11 text-[15px] pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-[12px] text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-[15px]" loading={isSubmitting}>
              Criar conta
            </Button>

            <div className="text-center pt-1">
              <span className="text-[13px] text-muted-foreground">Já tem uma conta? </span>
              <Link
                to="/login"
                className="text-[13px] text-primary hover:underline transition-colors font-medium"
              >
                Entrar
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

// ── Shared brand panel ─────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 text-white max-w-md px-12"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur text-[13px] font-bold">
          CP
        </div>
        <span className="text-xl font-semibold">ConstruçãoPro</span>
      </div>
      <h1 className="text-[36px] font-bold tracking-tight leading-[1.1] mb-4">
        Gestão de Inventário para Construção Civil.
      </h1>
      <p className="text-[15px] text-white/60 leading-relaxed">
        Controle completo de estoque, materiais, movimentações e notas fiscais.
      </p>

      <div className="mt-10 flex gap-6">
        {[
          { label: 'Obras', value: '12+' },
          { label: 'Materiais', value: '500+' },
          { label: 'Uptime', value: '99.9%' },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-[11px] text-white/50 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
