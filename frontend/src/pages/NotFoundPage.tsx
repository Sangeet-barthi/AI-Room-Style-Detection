import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-elevated">
        <Compass className="size-6 text-accent" aria-hidden="true" />
      </span>
      <p className="kicker mt-8">Error 404</p>
      <h1 className="mt-4 text-headline">This room does not exist</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
        The page you were looking for has been moved or never existed. Let us get you back to
        somewhere useful.
      </p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft aria-hidden="true" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
