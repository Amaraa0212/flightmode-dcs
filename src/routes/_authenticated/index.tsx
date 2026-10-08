import z from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Departures } from '@/features/departures'

export const departuresSearchSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/')({
  validateSearch: departuresSearchSchema,
  component: Departures,
})
