import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CalculatorApi } from '../../../../api/calculatorApi'
import { ApiError } from '../../../../api/client'
import { fakeServer } from '../../state/testing'
import { Calculator } from './Calculator'

const fakeApi: CalculatorApi = {
  calculate: async (request) => {
    const reply = fakeServer(request)
    if ('error' in reply) throw new ApiError(reply.error, reply.error, 422)
    return { ...request, result: reply.result }
  },
}

/** Clicks keys by their accessible names. */
async function click(...names: string[]) {
  for (const name of names) {
    await userEvent.click(screen.getByRole('button', { name }))
  }
}

const display = () => screen.getByRole('status')

describe('Calculator', () => {
  it('calculates through the API', async () => {
    render(<Calculator api={fakeApi} />)

    await click('1', '2', 'Multiply', '3', 'Equals')

    await waitFor(() => expect(display()).toHaveTextContent('36'))
    expect(screen.getByTestId('expression')).toHaveTextContent('12 × 3 =')
  })

  it('chains operations left to right', async () => {
    render(<Calculator api={fakeApi} />)

    await click('2', 'Add', '3', 'Multiply')
    await waitFor(() => expect(display()).toHaveTextContent('5'))
    await click('4', 'Equals')

    await waitFor(() => expect(display()).toHaveTextContent('20'))
  })

  it('highlights the operator waiting for its operand', async () => {
    render(<Calculator api={fakeApi} />)

    await click('8', 'Divide')
    expect(screen.getByRole('button', { name: 'Divide' })).toHaveAttribute('aria-pressed', 'true')

    await click('2')
    expect(screen.getByRole('button', { name: 'Divide' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('groups thousands in the display', async () => {
    render(<Calculator api={fakeApi} />)
    await click('1', '2', '3', '4', '5', '6', '7')
    expect(display()).toHaveTextContent('1,234,567')
  })

  it('shows a friendly message for division by zero', async () => {
    render(<Calculator api={fakeApi} />)

    await click('1', '0', 'Divide', '0', 'Equals')

    await waitFor(() => expect(display()).toHaveTextContent("Can't divide by zero"))
  })

  it('shows a message when the service is unreachable', async () => {
    const offline: CalculatorApi = {
      calculate: () => Promise.reject(new ApiError('network_error', 'Failed to fetch')),
    }
    render(<Calculator api={offline} />)

    await click('9', 'Square root')

    await waitFor(() => expect(display()).toHaveTextContent("Can't reach the calculator service"))
  })

  it('falls back to a generic message for unknown errors', async () => {
    const broken: CalculatorApi = { calculate: () => Promise.reject(new ApiError('internal_error', 'x', 500)) }
    render(<Calculator api={broken} />)

    await click('9', 'Square root')

    await waitFor(() => expect(display()).toHaveTextContent('Something went wrong'))
  })

  it('marks itself busy while a request is in flight', async () => {
    let finish: (result: number) => void = () => {}
    const slow: CalculatorApi = {
      calculate: vi.fn<CalculatorApi['calculate']>(
        (request) => new Promise((resolve) => (finish = (result) => resolve({ ...request, result }))),
      ),
    }
    render(<Calculator api={slow} />)

    await click('1', '6', 'Square root')
    expect(screen.getByRole('group', { name: 'Keypad' })).toHaveAttribute('aria-busy', 'true')

    await click('5') // ignored while busy
    finish(4)

    await waitFor(() => expect(display()).toHaveTextContent('4'))
    expect(screen.getByRole('group', { name: 'Keypad' })).toHaveAttribute('aria-busy', 'false')
  })

  it('works from the keyboard (spec §3.8)', async () => {
    render(<Calculator api={fakeApi} />)

    await userEvent.keyboard('12*3{Enter}')

    await waitFor(() => expect(display()).toHaveTextContent('36'))
    await userEvent.keyboard('{Escape}')
    expect(display()).toHaveTextContent('0')
  })

  it('flashes the on-screen key for a physical key press', async () => {
    render(<Calculator api={fakeApi} />)
    const seven = screen.getByRole('button', { name: '7' })

    await userEvent.keyboard('7')

    expect(seven.className).toMatch(/flash/)
    await waitFor(() => expect(seven.className).not.toMatch(/flash/))
  })

  it('records calculations in history and reuses a result (spec H1, H3)', async () => {
    render(<Calculator api={fakeApi} />)
    const history = screen.getByRole('region', { name: 'History' })
    expect(within(history).getByText('No calculations yet')).toBeInTheDocument()

    await click('1', '2', 'Multiply', '3', 'Equals')
    const item = await within(history).findByRole('button', { name: '12 × 3 = 36. Use this result' })

    await click('All clear')
    expect(display()).toHaveTextContent('0')

    await userEvent.click(item)
    expect(display()).toHaveTextContent('36')
    expect(screen.getByRole('button', { name: 'History (1)' })).toBeInTheDocument()
  })

  it('clears history', async () => {
    render(<Calculator api={fakeApi} />)
    await click('9', 'Square root')
    await screen.findByRole('button', { name: '√9 = 3. Use this result' })

    await click('Clear')

    expect(screen.getByText('No calculations yet')).toBeInTheDocument()
  })

  it('toggles the history panel on narrow screens', async () => {
    render(<Calculator api={fakeApi} />)
    const toggle = screen.getByRole('button', { name: 'History (0)' })
    const panel = screen.getByRole('region', { name: 'History' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-controls', panel.id)

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('Hide history')
    expect(panel.className).toMatch(/historyOpen/)

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('restores the previous session after a remount', async () => {
    const { unmount } = render(<Calculator api={fakeApi} />)
    await click('4', '2', 'Add')
    unmount()

    render(<Calculator api={fakeApi} />)

    expect(display()).toHaveTextContent('42')
    expect(screen.getByTestId('expression')).toHaveTextContent('42 +')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'true')
  })
})
