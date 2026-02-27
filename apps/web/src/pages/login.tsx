import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type LoginInput, loginSchema } from '@/lib/schemas'
import { useAuthStore } from '@/stores/auth-store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    try {
      setError('')
      await login(data.email, data.password)
      navigate({ to: '/' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — Brand */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-[#1d1d1f]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/80 via-[#5856D6]/70 to-[#AF52DE]/60" />

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
            <h2 className="text-[28px] font-bold tracking-tight">Entrar</h2>
            <p className="text-muted-foreground mt-1 text-[15px]">
              Insira suas credenciais para continuar
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/15 p-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                className="h-11 text-[15px]"
              />
              {errors.email && (
                <p className="text-[12px] text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-11 text-[15px] pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[12px] text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-[15px]" loading={isSubmitting}>
              Entrar
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
