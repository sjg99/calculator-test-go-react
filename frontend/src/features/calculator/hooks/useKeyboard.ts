import { useEffect, useEffectEvent } from 'react'

/**
 * Calls onKey with the mapped id when a mapped key is pressed anywhere on the
 * page. Ignores shortcuts with Ctrl, Meta or Alt, and typing in text fields.
 * Handled keys have their default action prevented, so Enter on a focused
 * button does not also click it and "/" does not open quick find.
 */
export function useKeyboard(keyMap: Readonly<Record<string, string>>, onKey: (id: string) => void) {
  const handleKey = useEffectEvent((id: string) => onKey(id))

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (isEditable(event.target)) return

      const id = keyMap[event.key]
      if (id === undefined) return

      event.preventDefault()
      handleKey(id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyMap])
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
