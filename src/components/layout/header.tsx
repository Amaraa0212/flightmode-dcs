import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  /** collapsed to a thin strip that opens on mouse over / keyboard focus (check-in counter) */
  autoHide?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, autoHide, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    document.addEventListener('scroll', onScroll, { passive: true })

    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-12',
        // floats over the page instead of pushing it down, so the counter columns never reflow
        autoHide &&
          'group/header bg-background/95 absolute inset-x-0 top-0 h-2 overflow-hidden backdrop-blur transition-[height,box-shadow] duration-200 focus-within:h-12 focus-within:border-b focus-within:shadow-lg hover:h-12 hover:border-b hover:shadow-lg',
        fixed && !autoHide && 'header-fixed peer/header sticky top-0 w-[inherit]',
        offset > 10 && fixed ? 'shadow' : 'shadow-none',
        className
      )}
      {...props}
    >
      {autoHide && (
        // the visible strip while collapsed
        <span className='bg-border absolute inset-x-1/3 top-0.5 h-1 rounded-full transition-opacity group-hover/header:opacity-0 group-focus-within/header:opacity-0' />
      )}
      <div
        className={cn(
          'relative flex h-full items-center gap-2 px-3 py-2 sm:gap-3',
          autoHide && 'h-12 opacity-0 transition-opacity group-focus-within/header:opacity-100 group-hover/header:opacity-100',
          offset > 10 &&
            fixed &&
            'after:bg-background/20 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg'
        )}
      >
        <SidebarTrigger variant='outline' className='max-md:scale-110' />
        <Separator orientation='vertical' className='h-5' />
        {children}
      </div>
    </header>
  )
}
