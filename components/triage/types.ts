import type { Ticket, TicketStatus } from '@/lib/tickets'

export type AssignmentLog = {
  assignedTo: string
  assignedAt: number
  team: string
  reason?: string
}

export type QueueTicket = Ticket & {
  createdAt: number
  status: TicketStatus
  assignment?: AssignmentLog
}
