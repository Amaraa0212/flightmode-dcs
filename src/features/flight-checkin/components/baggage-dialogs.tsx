import { z } from 'zod'
import type { StandardDialogProps } from '@/lib/dialog-types'
import type { CheckedBaggage } from '@/services'
import {
  ConfigFormDialog,
  type FormFieldConfig,
} from '@/components/ui/config-form-dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useBaggageActions } from '../hooks/use-dcs-actions'

export const crewBaggageSchema = z.object({
  crew_name: z.string().trim().min(2, 'Crew name is required'),
  pieces: z.number().int().min(1).max(5),
  weight_kg: z.number().min(1).max(160),
  description: z.string().optional(),
})

export type CrewBaggageForm = z.infer<typeof crewBaggageSchema>

const CREW_FIELDS: FormFieldConfig<CrewBaggageForm>[] = [
  { name: 'crew_name', label: 'Crew member', type: 'text', placeholder: 'CPT BATBOLD', required: true, gridCols: 2 },
  { name: 'pieces', label: 'Pieces', type: 'number', min: '1', required: true, gridCols: 1 },
  { name: 'weight_kg', label: 'Total weight (kg)', type: 'number', min: '1', required: true, gridCols: 1 },
  { name: 'description', label: 'Note', type: 'text', placeholder: 'Crew kit', gridCols: 2 },
]

export function CrewBaggageDialog({
  open,
  onClose,
  flightId,
}: Omit<StandardDialogProps, 'data'> & { flightId: number }) {
  const { addCrew } = useBaggageActions(onClose)

  return (
    <ConfigFormDialog<CrewBaggageForm>
      open={open}
      onClose={onClose}
      schema={crewBaggageSchema}
      fields={CREW_FIELDS}
      onSubmit={async (payload) => {
        await addCrew.mutateAsync({ flightId, payload })
      }}
      title='Add crew baggage'
      description='Crew bag tags use sequence 999 so they never collide with passenger tags.'
      submitButtonText='Accept & tag'
      isSubmitting={addCrew.isPending}
      defaultValues={{ crew_name: '', pieces: 1, weight_kg: 20, description: '' }}
      maxWidth='md'
    />
  )
}

export function BaggageDeleteDialog({
  open,
  onClose,
  onSuccess,
  data,
}: StandardDialogProps<CheckedBaggage> & { data: CheckedBaggage }) {
  const { remove } = useBaggageActions(() => {
    onSuccess?.()
    onClose()
  })

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      handleConfirm={() => remove.mutate(data.id)}
      title='Remove baggage'
      desc={`Remove ${data.pieces} pc / ${data.weight_kg} kg of ${data.owner}? Tags ${data.tags.map((t) => t.tag_number).join(', ')} will be voided.`}
      confirmText='Remove'
      cancelBtnText='Cancel'
      destructive
      isLoading={remove.isPending}
    />
  )
}
