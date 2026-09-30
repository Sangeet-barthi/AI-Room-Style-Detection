import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Eye, EyeOff, UserPlus, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

const RULES = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
]

const schema = z
  .object({
    full_name: z.string().trim().min(2, 'Enter your name').max(120, 'That name is too long'),
    email: z.string().min(1, 'Enter your email address').email('That does not look like an email'),
    password: z
      .string()
      .min(8, 'Passwords need at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/\d/, 'Include at least one number'),
    confirm_password: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type FormValues = z.infer<typeof schema>

const STRENGTH_LABEL = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_CLASS = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-warning', 'bg-success']

function PasswordStrength({ value }: { value: string }) {
  const passed = RULES.filter((rule) => rule.test(value)).length
  const score = value.length === 0 ? 0 : passed

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
          {RULES.map((_, index) => (
            <motion.span
              key={index}
              className={cn(
                'h-full flex-1 rounded-full transition-colors duration-base',
                index < score ? STRENGTH_CLASS[score] : 'bg-elevated',
              )}
              animate={{ scaleY: index < score ? 1 : 0.6 }}
              transition={{ duration: 0.25 }}
            />
          ))}
        </div>
        <span className="w-20 text-right text-[11px] font-medium text-muted" aria-live="polite">
          {value.length > 0 ? STRENGTH_LABEL[score] : ''}
        </span>
      </div>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {RULES.map((rule) => {
          const ok = rule.test(value)
          return (
            <li
              key={rule.label}
              className={cn('flex items-center gap-2 text-[12px]', ok ? 'text-success' : 'text-subtle')}
            >
              {ok ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <X className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Create account · RoomStyle AI'
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  })

  const password = watch('password')

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await registerUser({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
      })
      toast({
        title: 'Account created',
        description: 'Let us analyse your first room.',
        tone: 'success',
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not create your account. Please try again.',
      )
    }
  })

  return (
    <motion.div variants={stagger(0.05, 0.07)} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <p className="kicker">Get started</p>
        <h1 className="mt-4 text-headline">Create your account</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Free to set up. Your first room analysis takes about a minute.
        </p>
      </motion.div>

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
          <Label htmlFor="full_name">Name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Akshay Patil"
            aria-invalid={Boolean(errors.full_name)}
            {...register('full_name')}
          />
          <FieldError>{errors.full_name?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              className="pr-12"
              aria-invalid={Boolean(errors.password)}
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
          <PasswordStrength value={password ?? ''} />
          <FieldError>{errors.password?.message}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            aria-invalid={Boolean(errors.confirm_password)}
            {...register('confirm_password')}
          />
          <FieldError>{errors.confirm_password?.message}</FieldError>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {!isSubmitting && <UserPlus aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Create Account'}
        </Button>
      </motion.form>

      <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  )
}
