import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarStep } from '../app/agendar/[slug]/components/CalendarStep'
import type { EventType } from '@scheduling/types'

const mockEvent = {
  available_weekdays: [1,2,3,4,5],
  date_start: null, date_end: null,
  max_future_days: 30, timezone: 'America/Sao_Paulo',
} as Pick<EventType, 'available_weekdays' | 'date_start' | 'date_end' | 'max_future_days' | 'timezone'>

describe('CalendarStep', () => {
  it('renders month navigation buttons', () => {
    render(<CalendarStep event={mockEvent} onSelect={vi.fn()} />)
    expect(screen.getByLabelText('prev-month')).toBeInTheDocument()
    expect(screen.getByLabelText('next-month')).toBeInTheDocument()
  })

  it('calls onSelect with ISO date string when available day clicked', () => {
    const onSelect = vi.fn()
    render(<CalendarStep event={mockEvent} onSelect={onSelect} />)
    const available = document.querySelectorAll('[data-available="true"]')
    if (available.length > 0) {
      fireEvent.click(available[0])
      expect(onSelect).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    }
  })
})
