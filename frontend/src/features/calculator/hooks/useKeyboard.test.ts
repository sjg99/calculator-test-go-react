import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboard } from './useKeyboard'

const keyMap = { '7': 'd7', Enter: 'equals', '/': 'divide' }

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = window) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('useKeyboard', () => {
  it('calls onKey with the mapped id and prevents the default action', () => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))

    const event = press('/')

    expect(onKey).toHaveBeenCalledWith('divide')
    expect(event.defaultPrevented).toBe(true)
  })

  it('handles keys pressed while a button has focus', () => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))
    const button = document.body.appendChild(document.createElement('button'))

    const event = press('Enter', {}, button)

    expect(onKey).toHaveBeenCalledWith('equals')
    expect(event.defaultPrevented).toBe(true) // so the focused button is not clicked too
    button.remove()
  })

  it('ignores unmapped keys', () => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))

    const event = press('q')

    expect(onKey).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it.each([{ ctrlKey: true }, { metaKey: true }, { altKey: true }])('ignores shortcuts with %o', (modifier) => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))

    press('7', modifier)

    expect(onKey).not.toHaveBeenCalled()
  })

  it.each(['input', 'textarea', 'select'])('ignores typing in a %s', (tag) => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))
    const field = document.body.appendChild(document.createElement(tag))

    press('7', {}, field)

    expect(onKey).not.toHaveBeenCalled()
    field.remove()
  })

  it('ignores typing in contenteditable elements', () => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))
    const editor = document.body.appendChild(document.createElement('div'))
    editor.contentEditable = 'true'
    // jsdom does not implement isContentEditable.
    Object.defineProperty(editor, 'isContentEditable', { value: true })

    press('7', {}, editor)

    expect(onKey).not.toHaveBeenCalled()
    editor.remove()
  })

  it('ignores events another handler already handled', () => {
    const onKey = vi.fn()
    renderHook(() => useKeyboard(keyMap, onKey))
    const handled = (e: Event) => e.preventDefault()
    window.addEventListener('keydown', handled, { capture: true })

    press('7')

    expect(onKey).not.toHaveBeenCalled()
    window.removeEventListener('keydown', handled, { capture: true })
  })

  it('uses the latest onKey without re-subscribing', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = renderHook(({ onKey }) => useKeyboard(keyMap, onKey), { initialProps: { onKey: first } })

    rerender({ onKey: second })
    press('7')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith('d7')
  })

  it('stops listening on unmount', () => {
    const onKey = vi.fn()
    const { unmount } = renderHook(() => useKeyboard(keyMap, onKey))

    unmount()
    press('7')

    expect(onKey).not.toHaveBeenCalled()
  })
})
