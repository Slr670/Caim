import { EventEmitter } from "events"

class DashboardEventEmitter extends EventEmitter {}

declare global {
  var _dashboardEventEmitter: DashboardEventEmitter | undefined
}

export const dashboardEmitter: DashboardEventEmitter =
  global._dashboardEventEmitter || new DashboardEventEmitter()

if (process.env.NODE_ENV !== "production") {
  global._dashboardEventEmitter = dashboardEmitter
}

export const DASHBOARD_EVENTS = {
  TICKETS_CHANGED: "tickets_changed",
  RMA_CHANGED: "rma_changed",
}
