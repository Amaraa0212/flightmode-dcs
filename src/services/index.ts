/**
 * Services barrel — flightmode-api (Laravel) client.
 */

// ─── Shared ───
export { client, ApiError } from './api/shared/client'
export { authService } from './api/shared/auth.service'

// ─── DCS ───
export {
  dcsFlightService,
  dcsPassengerService,
  dcsBaggageService,
  dcsSeatMapService,
  announcementService,
  issueReportService,
} from './api/dcs/dcs.service'

// ─── Types ───
export * from './types/shared/common.types'
export * from './types/shared/auth.types'
export * from './types/dcs/dcs.types'
