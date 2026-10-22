import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Printer, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { dcsBaggageService, dcsPassengerService, type DcsFlight } from '@/services'
import { cn } from '@/lib/utils'
import { passengerName } from '@/lib/flight'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce'
import { printBagTags, useBaggageActions } from '../hooks/use-dcs-actions'
import { useCommand } from '../shortcuts'
import { QUERY_KEYS } from './constants'
import { PanelHeader } from './panel-header'

type BaggagePanelProps = {
  flight: DcsFlight
  segmentId?: number
}

const CREW = 'crew'
const CARGO = 'cargo'

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className='flex items-center justify-between py-1.5 text-sm'>
      <span className={strong ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
      <span className={cn('font-mono', strong && 'text-brand font-bold')}>{value}</span>
    </div>
  )
}

export function BaggagePanel({ flight, segmentId }: BaggagePanelProps) {
  const [option, setOption] = useState<string | null>(null)
  const [crewName, setCrewName] = useState('')
  const [cargoNote, setCargoNote] = useState('')
  const [pieces, setPieces] = useState('1')
  const [weight, setWeight] = useState('')
  // excess baggage is paid (billing / transaction number) or waived (reason + who allowed it)
  const [settle, setSettle] = useState<'paid' | 'waive'>('paid')
  const [paymentRef, setPaymentRef] = useState('')
  const [waiveReason, setWaiveReason] = useState('')
  const [waivedBy, setWaivedBy] = useState('')
  const weightRef = useRef<HTMLInputElement>(null)
  const { add, addCrew, addCargo, remove } = useBaggageActions(() => {
    setWeight('')
    setCrewName('')
    setCargoNote('')
    setPaymentRef('')
    setWaiveReason('')
    setWaivedBy('')
  })

  // crew bags are taken with no passenger selected — a selected passenger only gets their own rules
  const crewMode = option === CREW && !segmentId
  const cargoMode = option === CARGO && !segmentId
  // crew and cargo bags belong to no passenger
  const flightBagMode = crewMode || cargoMode
  const flightOpen = flight.status === 'checkin_open'

  const { data: pax } = useQuery({
    queryKey: [QUERY_KEYS.PASSENGER, segmentId],
    queryFn: async () => (await dcsPassengerService.getById(segmentId!)).body,
    enabled: !!segmentId,
  })
  const { data: rules } = useQuery({
    queryKey: [QUERY_KEYS.SEGMENT_BAGGAGE, segmentId],
    queryFn: async () => (await dcsBaggageService.rulesForSegment(segmentId!)).body,
    enabled: !!segmentId,
  })
  const { data: crewBags = [] } = useQuery({
    queryKey: [QUERY_KEYS.BAGGAGE, flight.id, option],
    queryFn: async () =>
      (
        await dcsBaggageService.list(flight.id, {
          type: option ?? CREW,
          pageSize: 500,
        })
      ).body?.items ?? [],
    enabled: flightBagMode,
  })
  // charter (захиалгат): every bag is free — no rule to pick, no limit, no excess (legacy DCS)
  const isCharter = !!rules?.is_charter

  // Default option: the passenger's free-bag rule for their cabin
  const defaultRule = useMemo(
    () =>
      rules?.rules.find((r) => !r.ssr_code && r.cabin_class === pax?.cabin_class) ??
      rules?.rules.find((r) => !r.ssr_code) ??
      rules?.rules[0],
    [rules, pax?.cabin_class]
  )
  const selectedRule =
    flightBagMode || isCharter
      ? undefined
      : (rules?.rules.find((r) => String(r.id) === option) ?? defaultRule)
  const selectedKey = flightBagMode
    ? option
    : selectedRule
      ? String(selectedRule.id)
      : null

  const list = flightBagMode ? crewBags : (rules?.accepted ?? [])
  // bags may be weighed before the check-in (legacy counter) — booked or checked-in passengers
  const paxCanHaveBags =
    !!pax &&
    pax.type !== 'INF' &&
    (pax.status === 'checked_in' ||
      (pax.status === 'booked' && pax.screening?.status !== 'banned'))
  const canAccept = flightBagMode
    ? flightOpen
    : flightOpen && paxCanHaveBags && (isCharter || !!selectedRule)

  // Price preview comes from the API (BaggagePricing) — the counter never calculates prices
  const debouncedPieces = Number(useDebounce(pieces, 300))
  const debouncedWeight = Number(useDebounce(weight, 300))
  const quotePayload = useMemo(
    () =>
      selectedRule && debouncedPieces > 0 && debouncedWeight > 0
        ? { baggage_rule_id: selectedRule.id, pieces: debouncedPieces, weight_kg: debouncedWeight }
        : null,
    [selectedRule, debouncedPieces, debouncedWeight]
  )
  const { data: quote, error: quoteError } = useQuery({
    queryKey: [QUERY_KEYS.SEGMENT_BAGGAGE, segmentId, 'quote', quotePayload],
    queryFn: async () =>
      (await dcsBaggageService.quote(segmentId!, quotePayload!)).body,
    enabled: !!segmentId && !!quotePayload && canAccept && !flightBagMode,
    retry: false,
  })
  const needsSettlement =
    !flightBagMode &&
    !isCharter &&
    !quoteError &&
    (quote?.excess_price ?? 0) > 0
  const totalPieces = list.reduce((s, b) => s + b.pieces, 0)
  const totalWeight = list.reduce((s, b) => s + b.weight_kg, 0)
  const totalAmount = list.reduce((s, b) => s + b.excess_price + b.price - b.waived_amount, 0)

  const hint = flightBagMode
    ? !flightOpen && 'Baggage can be accepted only while check-in is open.'
    : !pax
      ? 'Select a passenger to register baggage.'
      : !paxCanHaveBags
        ? `Baggage cannot be accepted for a ${pax.status.replace('_', ' ')} passenger.`
        : !flightOpen
          ? 'Baggage can be accepted only while check-in is open.'
          : !isCharter &&
            !rules?.rules.length &&
            'No baggage rules are attached to this flight.'

  // Ctrl+B: straight to the weight field (Enter in it accepts the bag and prints the tag)
  useCommand('baggage', () => {
    if (!weightRef.current) {
      toast.info(hint || 'Baggage cannot be accepted now.', { id: 'shortcut' })
      return
    }
    weightRef.current.focus()
    weightRef.current.select()
  })

  // Ctrl+1-9: reprint the tags of bag no. N in the list below
  useCommand('bagTag', (n) => {
    const bag = list[n - 1]
    if (!bag) {
      toast.warning(`Baggage ${n} not found`, { id: 'shortcut' })
      return
    }
    void printBagTags(bag.tags.map((t) => t.id))
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const weightKg = Number(weight)
    const pcs = Number(pieces)
    if (crewMode) {
      addCrew.mutate({
        flightId: flight.id,
        payload: { crew_name: crewName.trim() || undefined, pieces: pcs, weight_kg: weightKg },
      })
    } else if (cargoMode) {
      addCargo.mutate({
        flightId: flight.id,
        payload: {
          description: cargoNote.trim() || undefined,
          pieces: pcs,
          weight_kg: weightKg,
        },
      })
    } else if (pax && isCharter) {
      add.mutate({
        segmentId: pax.id,
        payload: { pieces: pcs, weight_kg: weightKg },
      })
    } else if (pax && selectedRule) {
      if (needsSettlement && settle === 'paid' && !paymentRef.trim()) {
        toast.warning('Enter the billing / transaction number of the excess payment, or waive it.')
        return
      }
      if (needsSettlement && settle === 'waive' && (!waiveReason.trim() || !waivedBy.trim())) {
        toast.warning('Enter why the excess is waived and who allowed it.')
        return
      }
      add.mutate({
        segmentId: pax.id,
        payload: {
          baggage_rule_id: selectedRule.id,
          pieces: pcs,
          weight_kg: weightKg,
          ...(needsSettlement && settle === 'paid' && { payment_reference: paymentRef.trim() }),
          ...(needsSettlement &&
            settle === 'waive' && { waive_reason: waiveReason.trim(), waive_authorized_by: waivedBy.trim() }),
        },
      })
    }
  }

  return (
    <section className='fm-panel flex min-w-0 flex-col overflow-hidden'>
      <PanelHeader
        title='Baggages Info'
        subtitle={
          crewMode
            ? 'Crew'
            : cargoMode
              ? 'Cargo'
              : pax
                ? passengerName(pax)
                : undefined
        }
      />

      <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4'>
        <div>
          <p className='mb-2 text-sm font-semibold'>Select Baggage Options:</p>
          <div className='grid gap-1.5'>
            {pax && isCharter && (
              <p className='rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300'>
                <b>Charter flight</b> — every bag is FREE. Enter pieces and
                weight.
              </p>
            )}
            {(pax ? (rules?.rules ?? []) : []).map((rule) => (
              <OptionRow
                key={rule.id}
                checked={selectedKey === String(rule.id)}
                onSelect={() => setOption(String(rule.id))}
                code={rule.ssr_code ?? rule.cabin_class ?? 'ALL'}
                label={rule.name}
              />
            ))}
            {!segmentId && (
              <>
                <OptionRow
                  checked={crewMode}
                  onSelect={() => setOption(crewMode ? null : CREW)}
                  code='CREW'
                  label='Crew bag'
                />
                <OptionRow
                  checked={cargoMode}
                  onSelect={() => setOption(cargoMode ? null : CARGO)}
                  code='CARGO'
                  label='Cargo / mail (own CARGO tag)'
                />
              </>
            )}
          </div>
          {!flightBagMode &&
            !isCharter &&
            rules &&
            rules.prepaid_pieces > 0 && (
              <p className='text-muted-foreground mt-2 text-xs'>
                Prepaid (XBAG): {rules.prepaid_pieces} pc
              </p>
            )}
        </div>

        {canAccept ? (
          <form onSubmit={submit} className='fm-inset grid gap-2 p-3'>
            {crewMode && (
              <Input
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                placeholder='Crew member name'
                className='h-9 uppercase'
              />
            )}
            {cargoMode && (
              <Input
                value={cargoNote}
                onChange={(e) => setCargoNote(e.target.value)}
                placeholder='What / for whom (e.g. Mail, AWB 123-4567)'
                className='h-9'
                maxLength={255}
              />
            )}
            <div className='flex items-end gap-2'>
              <label className='grid gap-1 text-xs'>
                <span className='text-muted-foreground'>Pcs</span>
                <Input
                  type='number'
                  min={1}
                  max={20}
                  value={pieces}
                  onChange={(e) => setPieces(e.target.value)}
                  className='h-9 w-16 font-mono'
                />
              </label>
              <label className='grid flex-1 gap-1 text-xs'>
                <span className='text-muted-foreground'>Weight (kg)</span>
                <Input
                  type='number'
                  min={0.1}
                  step='0.1'
                  ref={weightRef}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder='23'
                  className='h-9 font-mono'
                  required
                />
              </label>
            </div>
            {!flightBagMode && quoteError && (
              <p className='text-destructive text-[11px]'>
                {(quoteError as Error).message}
              </p>
            )}
            {!flightBagMode && !isCharter && quote && !quoteError && (
              <p className='text-muted-foreground text-[11px]'>
                Allowance {quote.free_allowance_kg} kg
                {quote.excess_kg > 0 && (
                  <span className='text-amber-500'>
                    {' '}• excess {quote.excess_kg} kg × {quote.excess_price_per_kg.toLocaleString()} ={' '}
                    {quote.excess_price.toLocaleString()}₮
                  </span>
                )}
                {quote.price > 0 && <span> • {quote.price.toLocaleString()}₮</span>}
                {quote.remaining_allowance_kg !== null && (
                  <span className='text-emerald-500'> • {quote.remaining_allowance_kg} kg free left</span>
                )}
              </p>
            )}
            {needsSettlement && (
              <div className='grid gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2'>
                <div className='flex gap-1 text-[11px]'>
                  {(['paid', 'waive'] as const).map((mode) => (
                    <button
                      key={mode}
                      type='button'
                      onClick={() => setSettle(mode)}
                      className={cn(
                        'flex-1 rounded-md border px-2 py-1 font-semibold transition',
                        settle === mode ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'text-muted-foreground'
                      )}
                    >
                      {mode === 'paid' ? 'Paid' : 'Waive'}
                    </button>
                  ))}
                </div>
                {settle === 'paid' ? (
                  <Input
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder='Billing / transaction number'
                    className='h-8 font-mono text-xs'
                    maxLength={100}
                  />
                ) : (
                  <>
                    <Input
                      value={waiveReason}
                      onChange={(e) => setWaiveReason(e.target.value)}
                      placeholder='Why is the excess waived?'
                      className='h-8 text-xs'
                      maxLength={500}
                    />
                    <Input
                      value={waivedBy}
                      onChange={(e) => setWaivedBy(e.target.value)}
                      placeholder='Allowed by (name / position)'
                      className='h-8 text-xs'
                      maxLength={100}
                    />
                  </>
                )}
              </div>
            )}
            <Button
              type='submit'
              size='sm'
              className='h-9 gap-1.5'
              disabled={
                add.isPending || addCrew.isPending || addCargo.isPending
              }
            >
              {add.isPending || addCrew.isPending || addCargo.isPending ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Plus className='size-4' />
              )}
              Add & print bag tag
            </Button>
          </form>
        ) : (
          hint && <p className='fm-inset text-muted-foreground p-3 text-xs'>{hint}</p>
        )}

        <div>
          <p className='mb-2 text-sm font-semibold'>Baggage List:</p>
          {list.length ? (
            <ul className='space-y-1.5'>
              {list.map((bag) => (
                <li key={bag.id} className='fm-inset flex items-start gap-2 px-3 py-2 text-xs'>
                  <Tag className='text-brand mt-0.5 size-3.5 shrink-0' />
                  <div className='min-w-0 flex-1'>
                    {bag.tags.map((t) => (
                      <p key={t.id} className='text-brand font-mono font-semibold'>
                        {t.tag_number}
                      </p>
                    ))}
                    <p className='text-muted-foreground truncate'>
                      {flightBagMode
                        ? `${bag.owner} • `
                        : bag.rule
                          ? `${bag.rule} • `
                          : isCharter
                            ? 'FREE • '
                            : ''}
                      {bag.pieces} pc / {bag.weight_kg} kg
                      {bag.excess_kg > 0 && (
                        <span className='text-amber-500'> • +{bag.excess_kg} kg</span>
                      )}
                    </p>
                    {bag.payment_reference && (
                      <p className='text-muted-foreground truncate font-mono'>Paid · {bag.payment_reference}</p>
                    )}
                    {bag.waived_amount > 0 && (
                      <p className='truncate text-emerald-600 dark:text-emerald-400' title={bag.waive_reason ?? ''}>
                        Waived · {bag.waive_authorized_by}
                      </p>
                    )}
                  </div>
                  <button
                    type='button'
                    onClick={() => void printBagTags(bag.tags.map((t) => t.id))}
                    className='text-muted-foreground hover:text-brand'
                    aria-label='Reprint bag tags'
                    title='Reprint bag tags'
                  >
                    <Printer className='size-3.5' />
                  </button>
                  {flightOpen && (
                    <button
                      type='button'
                      onClick={() => remove.mutate(bag.id)}
                      className='text-muted-foreground hover:text-destructive'
                      aria-label='Remove baggage'
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className='text-muted-foreground text-xs'>No baggages registered.</p>
          )}
        </div>

        <div className='border-t pt-2'>
          <Row label='Total Baggages' value={totalPieces} />
          <Row label='Total Weight' value={`${totalWeight.toFixed(2)} KG`} />
          <div className='bg-border my-1 h-0.5 rounded' />
          <Row label='Total' value={`${totalAmount.toLocaleString()}₮`} strong />
        </div>
      </div>
    </section>
  )
}

function OptionRow({
  checked,
  onSelect,
  code,
  label,
}: {
  checked: boolean
  onSelect: () => void
  code: string
  label: string
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-start text-sm transition',
        checked ? 'border-cyan-400/60 bg-cyan-400/10' : 'hover:border-cyan-400/30'
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded-full border',
          checked ? 'border-cyan-400' : 'border-muted-foreground/50'
        )}
      >
        {checked && <span className='size-2 rounded-full bg-cyan-400' />}
      </span>
      <span className='font-mono text-xs font-semibold'>{code}</span>
      <span className='text-muted-foreground truncate'>- {label}</span>
    </button>
  )
}
