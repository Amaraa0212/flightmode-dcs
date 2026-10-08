import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { FlightCheckin } from '@/features/flight-checkin'
import { TABS } from '@/features/flight-checkin/components/constants'

export const flightCheckinSearchSchema = z.object({
  tab: z.enum(TABS).optional(),
  pax: z.number().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  query: z.string().optional(),
  status: z.array(z.string()).optional(),
  cabin: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
})

export const Route = createFileRoute('/_authenticated/flights/$flightId')({
  validateSearch: flightCheckinSearchSchema,
  component: FlightCheckin,
})
