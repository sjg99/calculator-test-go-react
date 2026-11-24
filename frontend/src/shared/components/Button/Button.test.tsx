import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders a non-submitting button that calls onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>7</Button>)

    const button = screen.getByRole('button', { name: '7' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('applies the variant, active state and extra class names', () => {
    render(
      <Button variant="operator" active className="extra">
        +
      </Button>,
    )
    const button = screen.getByRole('button')
    expect(button.className).toMatch(/operator/)
    expect(button.className).toMatch(/active/)
    expect(button.className).toMatch(/extra/)
  })

  it('passes through native attributes', () => {
    render(<Button aria-label="Add" disabled />)
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
  })
})
