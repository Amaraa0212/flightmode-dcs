import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { printBagTags, printBoardingPass } from '@/lib/print-jobs'
import { shouldReloadDcsQuery } from '@/hooks/use-flight-channel'
import { QUERY_KEYS } from '../components/constants'
import {
  dcsBaggageService,
  dcsFlightService,
  dcsPassengerService,
  type AddBaggagePayload,
  type AddCrewBaggagePayload,
  type CheckedBaggage,
  type GoShowPayload,
  type PassengerPayload,
} from '@/services'

/**
 * DCS mutation бүрийн дараа `dcs-*` query-г шинэчилнэ.
 * Live үед flight-ийн тоонууд socket-оор ирдэг тул flight-ийг дахин татахгүй.
 */
export function useInvalidateDcs() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ predicate: (q) => shouldReloadDcsQuery(q.queryKey) })
}

function useDcsMutation<TVars, TRes extends { message: string }>(
  mutationFn: (vars: TVars) => Promise<TRes>,
  onDone?: (res: TRes, vars: TVars) => void
) {
  const invalidate = useInvalidateDcs()
  return useMutation({
    mutationFn,
    onSuccess: (res, vars) => {
      toast.success(res.message)
      invalidate()
      onDone?.(res, vars)
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useFlightActions(flightId: number) {
  const queryClient = useQueryClient()
  // the flight itself changed — reload it even while live
  const reloadFlight = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FLIGHT, flightId] })
  return {
    open: useDcsMutation(() => dcsFlightService.openCheckin(flightId), reloadFlight),
    /** closeOnline = false closes only the counter (online check-in stays open) */
    close: useDcsMutation(
      (closeOnline: boolean) => dcsFlightService.closeCheckin(flightId, closeOnline),
      reloadFlight
    ),
  }
}

export function usePassengerActions(options?: {
  onSaved?: () => void
  onAdded?: (segmentId: number) => void
}) {
  return {
    update: useDcsMutation(
      (vars: { passengerId: number; payload: PassengerPayload }) =>
        dcsPassengerService.update(vars.passengerId, vars.payload),
      () => options?.onSaved?.()
    ),
    addGoShow: useDcsMutation(
      (vars: { flightId: number; payload: GoShowPayload }) =>
        dcsPassengerService.addGoShow(vars.flightId, vars.payload),
      (res) => res.body?.segment_id && options?.onAdded?.(res.body.segment_id)
    ),
    /** print: legacy "Enter" on the seat map — check in, then print the boarding pass */
    checkIn: useDcsMutation(
      (vars: { segmentId: number; seat?: string; print?: boolean }) =>
        dcsPassengerService.checkIn(vars.segmentId, vars.seat),
      (_res, vars) => vars.print && void printBoardingPass(vars.segmentId)
    ),
    uncheck: useDcsMutation((segmentId: number) =>
      dcsPassengerService.uncheck(segmentId)
    ),
    holdSeat: useDcsMutation((vars: { segmentId: number; seat: string | null }) =>
      dcsPassengerService.holdSeat(vars.segmentId, vars.seat)
    ),
    changeSeat: useDcsMutation(
      (vars: { segmentId: number; seat: string; print?: boolean }) =>
        dcsPassengerService.changeSeat(vars.segmentId, vars.seat),
      (_res, vars) => vars.print && void printBoardingPass(vars.segmentId)
    ),
    group: useDcsMutation((vars: { flightId: number; segmentIds: number[] }) =>
      dcsPassengerService.group(vars.flightId, vars.segmentIds)
    ),
    ungroup: useDcsMutation((segmentId: number) => dcsPassengerService.ungroup(segmentId)),
  }
}

export { printBagTags, printBoardingPass }

export function useBaggageActions(onDone?: () => void) {
  const accepted = (res: { body: CheckedBaggage | null }) => {
    onDone?.()
    // legacy "Print Bag Tag": tags are printed right after the bag is accepted
    if (res.body) void printBagTags(res.body.tags.map((t) => t.id))
  }
  return {
    add: useDcsMutation(
      (vars: { segmentId: number; payload: AddBaggagePayload }) =>
        dcsBaggageService.add(vars.segmentId, vars.payload),
      accepted
    ),
    addCrew: useDcsMutation(
      (vars: { flightId: number; payload: AddCrewBaggagePayload }) =>
        dcsBaggageService.addCrew(vars.flightId, vars.payload),
      accepted
    ),
    addCargo: useDcsMutation(
      (vars: {
        flightId: number
        payload: { pieces: number; weight_kg: number; description?: string }
      }) => dcsBaggageService.addCargo(vars.flightId, vars.payload),
      accepted
    ),
    remove: useDcsMutation(
      (baggageId: number) => dcsBaggageService.remove(baggageId),
      onDone
    ),
  }
}
