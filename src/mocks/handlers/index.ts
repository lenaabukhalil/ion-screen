import { authHandlers } from './auth'
import { billingHandlers } from './billing'
import { lookupsHandlers } from './lookups'
import { mediaHandlers } from './media'
import { schedulesHandlers } from './schedules'
import { screensHandlers } from './screens'

export const handlers = [
  ...authHandlers,
  ...mediaHandlers,
  ...schedulesHandlers,
  ...screensHandlers,
  ...billingHandlers,
  ...lookupsHandlers,
]
