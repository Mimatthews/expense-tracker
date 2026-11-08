import { useEffect, useRef, useState } from 'react'
import { IconClose, IconSpinner } from './Icons.jsx'

/* Muted, low-chroma swatches — matched to the seeded category colours so a new
   category never looks louder than the data around it. */
export const PALETTE = [
  '#6b8a9e',
  '#5f8a8a',
  '#5f8f7b',
  '#6f9070',
  '#9c8a5f',
  '#a3805f',
  '#9a6b70',
  '#8a6f92',
  '#7e7ba0',
  '#71879b',
  '#787f8a',
  '#8d8b84',
]

export default function CategoryModal({ initial, onClose, onSubmit, onDelete }) {
  const isEdit = Boolean(initial?.id)
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color || PALETTE[0])
  const [kind, setKind] = useState(initial?.kind || 'expense')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return setError('Give the category a name.')
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name: name.trim(), color, kind })
    } catch (err) {
      setError(err.message || 'Could not save this category.')
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} style={{ width: 'min(440px, 100%)' }}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit category' : 'New category'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="cat-name">Name</label>
            <input
              id="cat-name"
              ref={nameRef}
              maxLength={40}
              placeholder="e.g. Pet care"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="field">
            <label>Used for</label>
            <div className="segmented">
              <button
                type="button"
                className={kind === 'expense' ? 'active' : ''}
                onClick={() => setKind('expense')}
              >
                Expenses
              </button>
              <button
                type="button"
                className={kind === 'income' ? 'active' : ''}
                onClick={() => setKind('income')}
              >
                Income
              </button>
            </div>
          </div>

          <div className="field">
            <label>Colour</label>
            <div className="swatches">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  className={`swatch-btn ${color.toLowerCase() === c.toLowerCase() ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-foot">
          {isEdit && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onDelete(initial)}
            >
              Delete
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <IconSpinner size={14} className="spin" />}
            {isEdit ? 'Save' : 'Create category'}
          </button>
        </div>
      </form>
    </div>
  )
}
