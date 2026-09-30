import {
  ChevronLeft,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Scan,
  Settings,
  User as UserIcon,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToast } from '@/components/ui/toast'
import { useCapabilities } from '@/hooks/use-capabilities'
import { useIsDesktop } from '@/hooks/use-media-query'
import { cn, initials } from '@/lib/utils'
import { useAuth } from '@/stores/auth'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analyze', label: 'Analyze Room', icon: Scan },
  { to: '/history', label: 'History', icon: History },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const MOBILE_TABS = NAV_ITEMS.slice(0, 4)

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-canvas">
        <Scan className="size-4" aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className="font-display text-[15px] font-medium tracking-tight">RoomStyle AI</span>
      )}
    </div>
  )
}

function NavItems({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-base',
              isActive ? 'text-ink' : 'text-muted hover:bg-elevated hover:text-ink',
              collapsed && 'justify-center px-0',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-elevated"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <Icon className="relative size-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="relative">{label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useIsDesktop()
  const { toast } = useToast()
  const { data: capabilities } = useCapabilities()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [location.pathname])

  const handleLogout = async () => {
    await logout()
    toast({ title: 'Signed out', description: 'See you soon.', tone: 'info' })
    navigate('/login', { replace: true })
  }

  const userBlock = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md border border-line bg-surface p-2.5 text-left transition-colors hover:bg-elevated"
          aria-label="Account menu"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[13px] font-semibold text-accent">
            {initials(user?.full_name ?? 'U')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{user?.full_name}</span>
            <span className="block truncate text-xs text-muted">{user?.email}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <p className="text-sm font-medium text-ink">{user?.full_name}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserIcon aria-hidden="true" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <Settings aria-hidden="true" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-danger [&_svg]:text-danger">
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="flex min-h-dvh bg-canvas">
      {/* Desktop / tablet sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/60 p-4 md:flex"
      >
        <div className={cn('mb-8 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
          <Brand collapsed={collapsed} />
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          )}
        </div>

        <NavItems collapsed={collapsed} />

        <div className="mt-auto flex flex-col gap-3">
          {collapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <Menu aria-hidden="true" />
            </Button>
          ) : (
            <>
              {capabilities?.demo_mode && (
                <Badge variant="warning" className="justify-center">
                  Demo mode
                </Badge>
              )}
              <ThemeToggle className="self-start" />
              {userBlock}
            </>
          )}
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur md:hidden">
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu aria-hidden="true" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="p-5">
              <DrawerTitle className="sr-only">Navigation</DrawerTitle>
              <div className="mb-8">
                <Brand />
              </div>
              <NavItems onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-auto flex flex-col gap-3 pt-6">
                <ThemeToggle className="self-start" />
                {userBlock}
              </div>
            </DrawerContent>
          </Drawer>

          <Brand />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/analyze')}
            aria-label="Analyze a new room"
          >
            <Scan aria-hidden="true" />
          </Button>
        </header>

        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 md:py-10',
            !isDesktop && 'pb-24',
          )}
        >
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-surface/95 backdrop-blur md:hidden"
        >
          {MOBILE_TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-muted',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
