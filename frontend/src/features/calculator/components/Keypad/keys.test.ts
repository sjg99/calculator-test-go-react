import { describe, expect, it } from 'vitest'
import { KEYBOARD_MAP, KEYS, KEYS_BY_ID } from './keys'

describe('keys', () => {
  it('have unique ids', () => {
    expect(KEYS_BY_ID.size).toBe(KEYS.length)
  })

  it('map every keyboard shortcut to an existing key', () => {
    for (const [key, id] of Object.entries(KEYBOARD_MAP)) {
      expect(KEYS_BY_ID.has(id), `${key} → ${id}`).toBe(true)
    }
  })

  it('cover functional spec §3.8', () => {
    const expected: Record<string, string> = {
      '0': 'd0', '9': 'd9', '.': 'decimal', ',': 'decimal',
      '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '^': 'power',
      Enter: 'equals', '=': 'equals', Backspace: 'backspace',
      Escape: 'clear', Delete: 'clear', '%': 'percent', r: 'sqrt', n: 'sign',
    }
    expect(KEYBOARD_MAP).toMatchObject(expected)
  })
})
