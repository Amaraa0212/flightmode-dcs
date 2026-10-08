import { PlaneTakeoff } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: { name: 'Ops Agent', email: 'ops@ubn-airport.mn', avatar: '' },
  teams: [],
  navGroups: [
    {
      title: 'Counter',
      items: [{ title: 'Departures', url: '/', icon: PlaneTakeoff }],
    },
  ],
}
