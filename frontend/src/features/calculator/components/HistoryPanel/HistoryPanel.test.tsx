import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HistoryPanel } from './HistoryPanel'

const entries = [
  { id: 2, expression: '1,000 × 3', result: 3000 },
  { id: 1, expression: '√16', result: 4 },
]

describe('HistoryPanel', () => {
  it('is a region named History', () => {
    render(<HistoryPanel entries={[]} onSelect={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument()
  })

  it('shows an empty state and disables Clear when there is no history', () => {
    render(<HistoryPanel entries={[]} onSelect={vi.fn()} onClear={vi.fn()} />)

    expect(screen.getByText('No calculations yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })

  it('lists entries in the given order with formatted results', () => {
    render(<HistoryPanel entries={entries} onSelect={vi.fn()} onClear={vi.fn()} />)

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['1,000 × 3= 3,000', '√16= 4'])
  })

  it('selects an entry by id (spec H3)', async () => {
    const onSelect = vi.fn()
    render(<HistoryPanel entries={entries} onSelect={onSelect} onClear={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: '√16 = 4. Use this result' }))

    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('clears history (spec H4)', async () => {
    const onClear = vi.fn()
    render(<HistoryPanel entries={entries} onSelect={vi.fn()} onClear={onClear} />)

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onClear).toHaveBeenCalledOnce()
  })
})
