import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import type { CalculatorActions } from '../../hooks/useCalculator'
import { Keypad } from './Keypad'

type MockedActions = { [K in keyof CalculatorActions]: Mock<CalculatorActions[K]> }

function mockActions(): MockedActions {
  return {
    inputDigit: vi.fn<CalculatorActions['inputDigit']>(),
    inputDecimal: vi.fn<CalculatorActions['inputDecimal']>(),
    backspace: vi.fn<CalculatorActions['backspace']>(),
    toggleSign: vi.fn<CalculatorActions['toggleSign']>(),
    clear: vi.fn<CalculatorActions['clear']>(),
    chooseOperator: vi.fn<CalculatorActions['chooseOperator']>(),
    equals: vi.fn<CalculatorActions['equals']>(),
    squareRoot: vi.fn<CalculatorActions['squareRoot']>(),
    percent: vi.fn<CalculatorActions['percent']>(),
    recallHistoryEntry: vi.fn<CalculatorActions['recallHistoryEntry']>(),
    clearHistory: vi.fn<CalculatorActions['clearHistory']>(),
  }
}

describe('Keypad', () => {
  it('renders every key with an accessible name', () => {
    render(<Keypad actions={mockActions()} />)

    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual([
      'All clear', 'Backspace', 'Toggle sign', 'Divide',
      'Square root', 'Power', 'Percent', 'Multiply',
      '7', '8', '9', 'Subtract',
      '4', '5', '6', 'Add',
      '1', '2', '3', 'Equals',
      '0', 'Decimal point',
    ])
  })

  it.each([
    ['7', 'inputDigit', '7'],
    ['0', 'inputDigit', '0'],
    ['Decimal point', 'inputDecimal', undefined],
    ['All clear', 'clear', undefined],
    ['Backspace', 'backspace', undefined],
    ['Toggle sign', 'toggleSign', undefined],
    ['Square root', 'squareRoot', undefined],
    ['Percent', 'percent', undefined],
    ['Equals', 'equals', undefined],
    ['Add', 'chooseOperator', 'add'],
    ['Subtract', 'chooseOperator', 'subtract'],
    ['Multiply', 'chooseOperator', 'multiply'],
    ['Divide', 'chooseOperator', 'divide'],
    ['Power', 'chooseOperator', 'power'],
  ] as const)('"%s" calls %s', async (name, action, arg) => {
    const actions = mockActions()
    render(<Keypad actions={actions} />)

    await userEvent.click(screen.getByRole('button', { name }))

    expect(actions[action]).toHaveBeenCalledOnce()
    if (arg !== undefined) expect(actions[action]).toHaveBeenCalledWith(arg)
  })

  it('highlights the active operator only', () => {
    render(<Keypad actions={mockActions()} activeOperator="multiply" />)

    expect(screen.getByRole('button', { name: 'Multiply' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '7' })).not.toHaveAttribute('aria-pressed')
  })

  it('marks the keypad busy', () => {
    render(<Keypad actions={mockActions()} busy />)
    expect(screen.getByRole('group', { name: 'Keypad' })).toHaveAttribute('aria-busy', 'true')
  })
})
