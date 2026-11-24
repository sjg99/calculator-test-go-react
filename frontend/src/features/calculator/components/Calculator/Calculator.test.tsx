import { render, screen, waitFor } from '@testing-library/react'
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
