import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormStep } from '../app/agendar/[slug]/components/FormStep'
import type { FormField } from '@scheduling/types'

const fields: FormField[] = [
  { id:'1', event_type_id:'e1', label:'Nome', placeholder:'Seu nome', field_type:'text', options:null, is_required:true, display_order:0 },
  { id:'2', event_type_id:'e1', label:'E-mail', placeholder:'seu@email.com', field_type:'email', options:null, is_required:true, display_order:1 },
  { id:'3', event_type_id:'e1', label:'Comentário', placeholder:null, field_type:'textarea', options:null, is_required:false, display_order:2 },
]

describe('FormStep', () => {
  it('renders all configured fields', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument()
    expect(screen.getByLabelText(/E-mail/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Comentário/)).toBeInTheDocument()
  })

  it('marks required fields with asterisk indicator', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    const reqMarkers = document.querySelectorAll('[data-required="true"]')
    expect(reqMarkers.length).toBe(2)
  })

  it('shows optional indicator for non-required fields', () => {
    render(<FormStep fields={fields} onSubmit={vi.fn()} onBack={vi.fn()} submitting={false} />)
    expect(screen.getByText('(opcional)')).toBeInTheDocument()
  })
})
