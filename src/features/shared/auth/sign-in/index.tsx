import { useSearch } from '@tanstack/react-router'
import { APP } from '@/config/app'
import { useStation } from '@/hooks/use-station'
import { LogoImage, Wordmark } from '@/components/layout/logo-image'
import { StationClock } from '@/components/station-clock'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

function Footer() {
  const station = useStation()
  return (
    <div className='space-y-4'>
      <div className='bg-card/70 flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 backdrop-blur'>
        <div className='flex items-center gap-3 text-sm'>
          <span className='size-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px] shadow-cyan-400' />
          <span className='text-muted-foreground'>
            {station.code} departures • check-in counter
          </span>
        </div>
        <StationClock className='text-xs' />
      </div>
      <p className='text-muted-foreground text-center text-xs leading-relaxed'>
        Authorized Airline &amp; {station.shortName} Ground Personnel Only.
        <br />
        <span className='font-mono'>{APP.build}</span>
      </p>
    </div>
  )
}

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout footer={<Footer />}>
      <div className='mb-10 flex flex-col items-center text-center'>
        <div className='relative mb-6 flex size-40 items-center justify-center rounded-full border border-cyan-400/15 bg-cyan-400/[0.03]'>
          <div className='fm-glow size-24 rounded-[28%]'>
            <LogoImage />
          </div>
        </div>
        <Wordmark className='text-5xl' />
        <p className='text-muted-foreground mt-3 text-xs font-medium tracking-[0.2em] uppercase sm:text-sm'>
          Check-in counter • Airport ops
        </p>
      </div>
      <UserAuthForm redirectTo={redirect} />
    </AuthLayout>
  )
}
