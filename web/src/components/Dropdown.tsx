import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface DropdownOption {
  label: string
  group?: string // consecutive options with the same group sit under one heading
}

interface Props {
  options: DropdownOption[]
  value: number // index of the selected option
  onChange: (index: number) => void
  label: string // accessible name
}

// A dropdown whose list has a capped height and scrolls (a native <select> menu can't be
// sized with CSS) and can show group headings. Supports mouse, arrow keys, Enter/Space to
// pick, Escape to close. Headings aren't selectable; `value` and `onChange` use indexes
// into `options`.
export default function Dropdown({ options, value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(value) // the highlighted row while open
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)

  // Close when clicking anywhere outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Keep the highlighted row visible when navigating with the keyboard.
  useEffect(() => {
    if (open) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function openList() {
    setActive(value)
    setOpen(true)
  }

  function pick(i: number) {
    onChange(i)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (open) setActive((a) => Math.min(a + 1, options.length - 1))
        else openList()
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) setActive((a) => Math.max(a - 1, 0))
        else openList()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (open) pick(active)
        else openList()
        break
      case 'Escape':
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="dropdown" ref={root}>
      <button
        type="button"
        className="dropdown-button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{options[value].label}</span>
        <span className="dropdown-chevron" aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="dropdown-list" role="listbox" ref={list}>
          {options.flatMap((o, i) => {
            const items = []
            if (o.group && o.group !== options[i - 1]?.group) {
              items.push(
                <li key={`group-${o.group}`} role="presentation" className="dropdown-group">{o.group}</li>,
              )
            }
            items.push(
              <li
                key={`option-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === value}
                className={`dropdown-item${i === active ? ' active' : ''}${i === value ? ' selected' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
              >
                {o.label}
              </li>,
            )
            return items
          })}
        </ul>
      )}
    </div>
  )
}
