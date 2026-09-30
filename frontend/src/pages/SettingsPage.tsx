import { Cpu, ImageIcon, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { fadeUp, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { useTheme, type ThemeMode } from '@/stores/theme'

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', description: 'Warm off-white surfaces', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Charcoal, easier at night', icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your device setting', icon: Monitor },
]

export default function SettingsPage() {
  const { mode, setMode } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()

  useEffect(() => {
    document.title = 'Settings · RoomStyle AI'
  }, [])

  const handleLogout = async () => {
    await logout()
    toast({ title: 'Signed out', tone: 'info' })
    navigate('/login', { replace: true })
  }

  return (
    <motion.div variants={stagger(0.04, 0.07)} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeUp}>
        <PageHeader
          kicker="Preferences"
          title="Settings"
          description="Appearance, service configuration and session controls."
        />
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="p-7">
          <h2 className="text-[15px] font-medium text-ink">Appearance</h2>
          <p className="mt-1.5 text-[13px] text-muted">
            Applies instantly and is remembered on this device.
          </p>
          <div
            role="radiogroup"
            aria-label="Colour theme"
            className="mt-6 grid gap-3 sm:grid-cols-3"
          >
            {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const active = mode === value
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMode(value)}
                  className={cn(
                    'rounded-lg border p-5 text-left transition-all duration-base ease-premium',
                    active
                      ? 'border-accent bg-accent/5 shadow-subtle'
                      : 'border-line bg-surface hover:border-ink/25',
                  )}
                >
                  <Icon
                    className={cn('size-4', active ? 'text-accent' : 'text-muted')}
                    aria-hidden="true"
                  />
                  <p className="mt-3 text-[14px] font-medium text-ink">{label}</p>
                  <p className="mt-1 text-[12px] text-muted">{description}</p>
                </button>
              )
            })}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="p-7">
          <h2 className="text-[15px] font-medium text-ink">Service configuration</h2>
          <p className="mt-1.5 text-[13px] text-muted">
            Read-only. These come from the backend environment — no secret values are ever sent to
            the browser.
          </p>

          <dl className="mt-6 divide-y divide-line">
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="flex items-center gap-2.5 text-[14px] text-ink">
                <Cpu className="size-4 text-muted" aria-hidden="true" />
                Vision analysis
              </dt>
              <dd className="flex items-center gap-3">
                <span className="text-[13px] text-muted">{capabilities?.vision_model ?? '—'}</span>
                <Badge variant={capabilities?.vision_enabled ? 'success' : 'danger'}>
                  {capabilities?.vision_enabled ? 'Configured' : 'Not configured'}
                </Badge>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="flex items-center gap-2.5 text-[14px] text-ink">
                <ImageIcon className="size-4 text-muted" aria-hidden="true" />
                AI image generation
              </dt>
              <dd className="flex items-center gap-3">
                <span className="text-[13px] capitalize text-muted">
                  {capabilities?.image_generation_provider ?? '—'}
                </span>
                <Badge variant={capabilities?.image_generation_enabled ? 'success' : 'outline'}>
                  {capabilities?.image_generation_enabled ? 'Enabled' : 'Optional · disabled'}
                </Badge>
              </dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-[14px] text-ink">Maximum upload size</dt>
              <dd className="text-[13px] text-muted">{capabilities?.max_upload_mb ?? 10} MB</dd>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-[14px] text-ink">Demo mode</dt>
              <dd>
                <Badge variant={capabilities?.demo_mode ? 'warning' : 'outline'}>
                  {capabilities?.demo_mode ? 'Active' : 'Off'}
                </Badge>
              </dd>
            </div>
          </dl>

          {!capabilities?.image_generation_enabled && (
            <p className="mt-5 rounded-md bg-elevated p-4 text-[12px] leading-relaxed text-muted">
              With image generation disabled, before/after comparisons use the deterministic design
              mockup — the target palette plus concrete furniture, lighting, material and decor
              changes. Analysis is unaffected.
            </p>
          )}
        </Card>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="flex flex-wrap items-center justify-between gap-4 p-7">
          <div>
            <h2 className="text-[15px] font-medium text-ink">Session</h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Signing out clears your tokens and cached data from this browser.
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </Card>
      </motion.div>
    </motion.div>
  )
}
