import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Display } from './Display'

describe('Display', () => {
  it('shows the expression and the value in a live region', () => {
    render(<Display expression="12 × 3 =" value="36" />)

    expect(screen.getByTestId('expression')).toHaveTextContent('12 × 3 =')
    const output = screen.getByRole('status')
    expect(output).toHaveTextContent('36')
    expect(output).toHaveAttribute('aria-live', 'polite')
  })

  it('shows the error instead of the value', () => {
    render(<Display expression="10 ÷ 0" value="0" error="Can't divide by zero" />)

    const output = screen.getByRole('status')
    expect(output).toHaveTextContent("Can't divide by zero")
    expect(output.className).toMatch(/error/)
    expect(output).not.toHaveAttribute('data-size')
  })

  it.each([
    ['123,456', 'lg'],
    ['1,234,567,890', 'md'],
    ['1,234,567,890,123,456', 'sm'],
  ])('sizes %s as %s', (value, size) => {
    render(<Display expression="" value={value} />)
    expect(screen.getByRole('status')).toHaveAttribute('data-size', size)
  })

  it('marks the value busy while calculating', () => {
    render(<Display expression="" value="1" busy />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })
})
