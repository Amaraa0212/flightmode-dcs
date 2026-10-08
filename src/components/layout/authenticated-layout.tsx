import { useQuery } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import { authService } from '@/services'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { DrawerProvider } from '@/context/drawer-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AnnouncementBell, RequiredAnnouncementsModal } from '@/components/announcements'
import { ConfigDrawer } from '@/components/config-drawer'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { SkipToMain } from '@/components/skip-to-main'
import { ThemeSwitch } from '@/components/theme-switch'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('dcs_sidebar_state') !== 'false'
  const setUser = useAuthStore((s) => s.auth.setUser)

  // Refresh the profile (role, station, permissions) once per session
  useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await authService.me()
      if (res.body) setUser(res.body)
      return res.body
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <SearchProvider>
      <LayoutProvider>
        <DrawerProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SkipToMain />
            <AppSidebar />
            <SidebarInset
              className={cn(
                '@container/content',

                'has-[[data-layout=fixed]]:h-svh',

                'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]'
              )}
            >
              <Header fixed>
                <Search />
                <div className='ms-auto flex items-center space-x-4'>
                  <AnnouncementBell />
                  <ThemeSwitch />
                  <ConfigDrawer />
                  <ProfileDropdown />
                </div>
              </Header>
              {children ?? <Outlet />}
              <RequiredAnnouncementsModal />
            </SidebarInset>
          </SidebarProvider>
        </DrawerProvider>
      </LayoutProvider>
    </SearchProvider>
  )
}
