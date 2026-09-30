import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Mail, Save, ShieldCheck, User as UserIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { analysisApi } from '@/api/analysis'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FieldError, Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import { fadeUp, stagger } from '@/lib/motion'
import { formatDate, initials } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your name').max(120, 'That name is too long'),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z
      .string()
      .min(8, 'Passwords need at least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/\d/, 'Include at least one number'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    document.title = 'Profile · RoomStyle AI'
  }, [])

  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: analysisApi.stats })

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { full_name: user?.full_name ?? '' },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  const profileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) => authApi.updateProfile(values.full_name),
    onSuccess: (updated) => {
      setUser(updated)
      toast({ title: 'Profile updated', tone: 'success' })
    },
    onError: (error) =>
      toast({
        title: 'Update failed',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  const passwordMutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) =>
      authApi.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      passwordForm.reset()
      toast({ title: 'Password updated', tone: 'success' })
    },
    onError: (error) =>
      toast({
        title: 'Could not change password',
        description: error instanceof ApiError ? error.message : 'Please try again.',
        tone: 'error',
      }),
  })

  return (
    <motion.div variants={stagger(0.04, 0.07)} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader kicker="Account" title="Profile" description="Your account details and activity." />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="flex flex-col gap-6 p-8 sm:flex-row sm:items-center">
          <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-2xl font-medium text-accent">
            {initials(user?.full_name ?? 'U')}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-ink">{user?.full_name}</h2>
            <p className="mt-1.5 flex items-center gap-2 text-[14px] text-muted">
              <Mail className="size-4" aria-hidden="true" />
              {user?.email}
            </p>
            {user?.created_at && (
              <p className="mt-1 text-[13px] text-subtle">
                Member since {formatDate(user.created_at)}
              </p>
            )}
          </div>
          <dl className="ml-auto grid grid-cols-2 gap-6 text-center sm:text-right">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-subtle">Analyses</dt>
              <dd className="mt-1 font-display text-2xl text-ink">
                {statsQuery.data?.total_analyses ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-subtle">Reports</dt>
              <dd className="mt-1 font-display text-2xl text-ink">
                {statsQuery.data?.reports_created ?? 0}
              </dd>
            </div>
          </dl>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
        <Card className="p-7">
          <div className="flex items-center gap-2.5">
            <UserIcon className="size-4 text-accent" aria-hidden="true" />
            <h2 className="text-[15px] font-medium text-ink">Display name</h2>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" {...profileForm.register('full_name')} />
              <FieldError>{profileForm.formState.errors.full_name?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email address</Label>
              <Input id="profile-email" value={user?.email ?? ''} disabled readOnly />
              <p className="text-[12px] text-subtle">
                Your email is your sign-in identity and cannot be changed here.
              </p>
            </div>
            <Button type="submit" loading={profileMutation.isPending}>
              <Save aria-hidden="true" />
              Save changes
            </Button>
          </form>
        </Card>

        <Card className="p-7">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-accent" aria-hidden="true" />
            <h2 className="text-[15px] font-medium text-ink">Change password</h2>
          </div>
          <form
            className="mt-6 space-y-4"
            onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...passwordForm.register('current_password')}
              />
              <FieldError>{passwordForm.formState.errors.current_password?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('new_password')}
              />
              <FieldError>{passwordForm.formState.errors.new_password?.message}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_new_password">Confirm new password</Label>
              <Input
                id="confirm_new_password"
                type="password"
                autoComplete="new-password"
                {...passwordForm.register('confirm_password')}
              />
              <FieldError>{passwordForm.formState.errors.confirm_password?.message}</FieldError>
            </div>
            <Button type="submit" variant="outline" loading={passwordMutation.isPending}>
              Update password
            </Button>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}
