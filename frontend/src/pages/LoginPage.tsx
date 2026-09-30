import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { fadeUp, stagger } from '@/lib/motion'
import { useAuth } from '@/stores/auth'

const schema = z.object({
  email: z.string().min(1, 'Enter your email address').email('That does not look like an email'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sign in · RoomStyle AI'
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const user = await login(values)
      toast({
        title: 'Welcome back',
        description: `Signed in as ${user.email}`,
        tone: 'success',
      })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/dashboard', { replace: true })
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'We could not sign you in. Please try again.'
      setFormError(message)
    }
  })

  return (
    <motion.div variants={stagger(0.05, 0.08)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className="kicker">Welcome back</p>
        <h1 className="mt-4 text-headline">Sign in</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Pick up where you left off — your analyses, scores and reports are waiting.
        </p>
      </motion.div>

      {capabilities?.demo_mode && (
        <motion.p
          variants={fadeUp}
          className="mt-6 rounded-md border border-warning/25 bg-warning/10 px-4 py-3 text-[13px] leading-relaxed text-warning"
        >
          Demo mode is enabled on this deployment. A seeded demo account is available — ask your
          administrator for the credentials configured in the environment.
        </motion.p>
      )}

      <motion.form variants={fadeUp} onSubmit={onSubmit} className="mt-9 space-y-5" noValidate>
        {formError && (
          <p
            role="alert"
            className="rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
          >
            {formError}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          <span id="email-error">
            <FieldError>{errors.email?.message}</FieldError>
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              className="pr-12"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted transition-colors hover:text-ink"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <span id="password-error">
            <FieldError>{errors.password?.message}</FieldError>
          </span>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {!isSubmitting && <LogIn aria-hidden="true" />}
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </Button>
      </motion.form>

      <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-muted">
        New to RoomStyle AI?{' '}
        <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </motion.p>
    </motion.div>
  )
}
