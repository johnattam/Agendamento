import type { TimeWindow } from '@scheduling/types'

export interface Slot {
  start: string  // "HH:MM"
  end: string    // "HH:MM"
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0')
  const m = (minutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

export function generateSlots(
  windows: TimeWindow[],
  durationMinutes: number,
  bufferMinutes: number
): Slot[] {
  const slots: Slot[] = []
  for (const window of windows) {
    const windowStart = timeToMinutes(window.start)
    const windowEnd = timeToMinutes(window.end)
    let current = windowStart
    while (current + durationMinutes <= windowEnd) {
      slots.push({
        start: minutesToTime(current),
        end: minutesToTime(current + durationMinutes),
      })
      current += durationMinutes + bufferMinutes
    }
  }
  return slots
}

export function filterAvailableSlots(
  slots: Slot[],
  busyTimes: { start: string; end: string }[],
  date: string,
  timezone: string
): Slot[] {
  return slots.filter((slot) => {
    const offsetMs = getTimezoneOffsetMs(timezone, new Date(`${date}T${slot.start}:00Z`))
    const slotStartMs = new Date(`${date}T${slot.start}:00Z`).getTime() - offsetMs
    const slotEndMs = new Date(`${date}T${slot.end}:00Z`).getTime() - offsetMs

    return !busyTimes.some((busy) => {
      const busyStart = new Date(busy.start).getTime()
      const busyEnd = new Date(busy.end).getTime()
      return slotStartMs < busyEnd && slotEndMs > busyStart
    })
  })
}

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' })
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone })
  return new Date(utcStr).getTime() - new Date(tzStr).getTime()
}
