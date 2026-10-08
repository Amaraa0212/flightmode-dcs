import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Save, UserPlus } from 'lucide-react'
import type { DcsPassenger, GoShowPayload, SsrOption } from '@/services'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const today = () => new Date().toISOString().slice(0, 10)

export const passengerFormSchema = z
  .object({
  last_name: z.string().trim().min(1, 'Surname is required').max(100),
  first_name: z.string().trim().min(1, 'Given name is required').max(100),
  middle_name: z.string().trim().max(100).optional(),
  gender: z.enum(['M', 'F']),
  date_of_birth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine((v) => v < today(), 'Must be in the past'),
  nationality: z.string().trim().min(2, '2–3 letters').max(3, '2–3 letters'),
  document_type: z.string().min(1).max(20),
  document_number: z.string().trim().min(3, 'Doc ID is required').max(50),
  document_expires_at: z.string().min(1, 'Date of expiry is required'),
  phone: z.string().trim().max(50).optional(),
  email: z.union([z.literal(''), z.email('Invalid email')]).optional(),
  emergency_contact: z.string().trim().max(255).optional(),
  remark: z.string().trim().max(255).optional(),
  cabin_class: z.enum(['C', 'Y']),
  ssr_codes: z.array(z.string()),
  // Infant (INF < 2 y) travels on the adult's lap — checked in together
  has_infant: z.boolean(),
  infant_last_name: z.string().trim().max(100),
  infant_first_name: z.string().trim().max(100),
  infant_gender: z.enum(['M', 'F']),
  infant_date_of_birth: z.string(),
  infant_document_number: z.string().trim().max(50),
  infant_document_expires_at: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.has_infant) return
    const need = (field: keyof typeof v, message: string) => {
      if (!String(v[field] ?? '').trim()) ctx.addIssue({ code: 'custom', path: [field], message })
    }
    need('infant_last_name', 'Required')
    need('infant_first_name', 'Required')
    need('infant_date_of_birth', 'Required')
    need('infant_document_number', 'Required')
    need('infant_document_expires_at', 'Required')
  })

export type PassengerFormValues = z.infer<typeof passengerFormSchema>

export function toFormValues(pax?: DcsPassenger | null): PassengerFormValues {
  return {
    last_name: pax?.last_name ?? '',
    first_name: pax?.first_name ?? '',
    gender: pax?.gender ?? 'M',
    date_of_birth: pax?.date_of_birth ?? '',
    nationality: pax?.nationality ?? 'MN',
    document_type: pax?.document_type ?? 'passport',
    document_number: pax?.document_number ?? '',
    document_expires_at: pax?.document_expires_at ?? '',
    phone: pax?.phone ?? '',
    email: pax?.email ?? '',
    middle_name: pax?.middle_name ?? '',
    emergency_contact: pax?.emergency_contact ?? '',
    remark: pax?.remark ?? '',
    cabin_class: pax?.cabin_class === 'C' ? 'C' : 'Y',
    ssr_codes: pax?.ssr_codes ?? [],
    has_infant: !!pax?.infant,
    infant_last_name: pax?.infant?.last_name ?? pax?.last_name ?? '',
    infant_first_name: pax?.infant?.first_name ?? '',
    infant_gender: pax?.infant?.gender ?? 'F',
    infant_date_of_birth: pax?.infant?.date_of_birth ?? '',
    infant_document_number: pax?.infant?.document_number ?? '',
    infant_document_expires_at: pax?.infant?.document_expires_at ?? '',
  }
}

/** Form values → API payload. Unticking "infant" on a passenger that had one removes it (infant: null). */
export function toPayload(values: PassengerFormValues, hadInfant: boolean): GoShowPayload {
  const {
    has_infant,
    infant_last_name,
    infant_first_name,
    infant_gender,
    infant_date_of_birth,
    infant_document_number,
    infant_document_expires_at,
    ...rest
  } = values
  const infant = has_infant
    ? {
        last_name: infant_last_name,
        first_name: infant_first_name,
        gender: infant_gender,
        date_of_birth: infant_date_of_birth,
        nationality: rest.nationality,
        document_type: rest.document_type,
        document_number: infant_document_number,
        document_expires_at: infant_document_expires_at,
      }
    : hadInfant
      ? null
      : undefined
  return {
    ...rest,
    email: rest.email || undefined,
    middle_name: rest.middle_name || undefined,
    emergency_contact: rest.emergency_contact || undefined,
    remark: rest.remark || undefined,
    ...(infant !== undefined && { infant }),
  }
}

type PassengerFormProps = {
  mode: 'edit' | 'create'
  defaultValues: PassengerFormValues
  isSubmitting?: boolean
  disabled?: boolean
  /** Airline-ийн санал болгодог SSR (GET /dcs/flights/{id}/ssr-codes) */
  ssrOptions: SsrOption[]
  onSubmit: (values: GoShowPayload) => void
  onCancel?: () => void
  /** Edit: the passenger already travels with an infant */
  hadInfant?: boolean
}

export const DOCUMENT_TYPES = [
  { label: 'Passport', value: 'passport' },
  { label: 'National ID', value: 'national_id' },
]

const labelClass = 'text-muted-foreground text-[11px] font-normal'
/** full-width text fields */
const wide = ['emergency_contact', 'remark']
const inputClass = 'h-8 text-sm'

export function PassengerForm({
  mode,
  defaultValues,
  isSubmitting,
  disabled,
  ssrOptions,
  onSubmit,
  onCancel,
  hadInfant = false,
}: PassengerFormProps) {
  const form = useForm<PassengerFormValues>({
    resolver: zodResolver(passengerFormSchema),
    defaultValues,
  })

  const hasInfant = form.watch('has_infant')

  const text = (
    name:
      | 'last_name'
      | 'first_name'
      | 'middle_name'
      | 'nationality'
      | 'document_number'
      | 'phone'
      | 'email'
      | 'emergency_contact'
      | 'remark'
      | 'infant_last_name'
      | 'infant_first_name'
      | 'infant_document_number',
    label: string,
    props: React.ComponentProps<'input'> = {}
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('gap-1', wide.includes(name) && 'col-span-2')}>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <Input {...field} {...props} value={field.value ?? ''} className={cn(inputClass, props.className)} />
          </FormControl>
          <FormMessage className='text-[11px]' />
        </FormItem>
      )}
    />
  )

  const date = (
    name: 'date_of_birth' | 'document_expires_at' | 'infant_date_of_birth' | 'infant_document_expires_at',
    label: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className='gap-1'>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <FormControl>
            <Input type='date' {...field} className={cn(inputClass, 'font-mono')} />
          </FormControl>
          <FormMessage className='text-[11px]' />
        </FormItem>
      )}
    />
  )

  const select = (
    name: 'gender' | 'document_type' | 'cabin_class' | 'infant_gender',
    label: string,
    options: { label: string; value: string }[]
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className='gap-1'>
          <FormLabel className={labelClass}>{label}</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className='h-8 w-full text-sm' size='sm'>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormItem>
      )}
    />
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          onSubmit(toPayload(values, hadInfant))
        )}
        className='grid gap-2.5'
      >
        <fieldset disabled={disabled || isSubmitting} className='grid grid-cols-2 gap-x-2 gap-y-2.5 disabled:opacity-60'>
          {text('last_name', 'Surname', { className: 'uppercase' })}
          {text('first_name', 'Given name', { className: 'uppercase' })}
          {text('middle_name', 'Middle name', { className: 'uppercase' })}
          {select('gender', 'Sex', [
            { label: 'Male', value: 'M' },
            { label: 'Female', value: 'F' },
          ])}
          {date('date_of_birth', 'Date of birth')}
          {text('nationality', 'Nationality', { className: 'uppercase', maxLength: 3 })}
          {select('document_type', 'Doc type', DOCUMENT_TYPES)}
          {text('document_number', 'Doc ID', { className: 'font-mono uppercase' })}
          {date('document_expires_at', 'Date of expiry')}
          {text('phone', 'Phone', { className: 'font-mono' })}
          {text('email', 'Email')}
          {mode === 'create' &&
            select('cabin_class', 'Cabin', [
              { label: 'Economy (Y)', value: 'Y' },
              { label: 'Business (C)', value: 'C' },
            ])}
          {text('emergency_contact', 'Emergency contact (name, phone, relation)')}
          {text('remark', 'Remark')}

          <FormField
            control={form.control}
            name='ssr_codes'
            render={({ field }) => (
              <FormItem className='col-span-2 gap-1'>
                <FormLabel className={labelClass}>SSR</FormLabel>
                <div className='flex flex-wrap gap-1'>
                  {!ssrOptions.length && (
                    <span className='text-muted-foreground text-[11px]'>
                      No SSR offered by this airline
                    </span>
                  )}
                  {ssrOptions.map(({ code, name: label }) => {
                    const active = field.value.includes(code)
                    return (
                      <button
                        key={code}
                        type='button'
                        title={label}
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((c) => c !== code)
                              : [...field.value, code]
                          )
                        }
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition',
                          active
                            ? 'border-amber-400/60 bg-amber-400/15 text-amber-600 dark:text-amber-300'
                            : 'text-muted-foreground hover:border-amber-400/40'
                        )}
                      >
                        {code}
                      </button>
                    )
                  })}
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='has_infant'
            render={({ field }) => (
              <FormItem className='col-span-2 flex-row items-center gap-2 border-t pt-2.5'>
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                </FormControl>
                <FormLabel className='text-sm font-medium'>Travelling with infant (INF, under 2)</FormLabel>
              </FormItem>
            )}
          />
          {hasInfant && (
            <>
              {text('infant_last_name', 'Infant surname', { className: 'uppercase' })}
              {text('infant_first_name', 'Infant given name', { className: 'uppercase' })}
              {select('infant_gender', 'Infant sex', [
                { label: 'Male', value: 'M' },
                { label: 'Female', value: 'F' },
              ])}
              {date('infant_date_of_birth', 'Infant date of birth')}
              {text('infant_document_number', 'Infant doc ID', { className: 'font-mono uppercase' })}
              {date('infant_document_expires_at', 'Infant doc expiry')}
            </>
          )}
        </fieldset>

        <div className='flex gap-2'>
          {onCancel && (
            <Button type='button' variant='outline' size='sm' className='h-9 flex-1' onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type='submit' size='sm' className='h-9 flex-1 gap-1.5' disabled={disabled || isSubmitting}>
            {isSubmitting ? (
              <Loader2 className='size-4 animate-spin' />
            ) : mode === 'edit' ? (
              <Save className='size-4' />
            ) : (
              <UserPlus className='size-4' />
            )}
            {mode === 'edit' ? 'Save changes' : 'Add go-show passenger'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
