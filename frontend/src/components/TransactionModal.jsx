import { useEffect, useMemo, useRef, useState } from 'react'
import { centsFromInput, centsToInput, todayISO } from '../lib/format.js'
import { IconClose, IconSpinner } from './Icons.jsx'

/**
 * Create / edit a transaction. `initial` may be a transaction object (edit)
 * or null (create). Amount is entered in major units and stored as cents.
 */
export default function TransactionModal({ initial, categories, currency, onClose, onSubmit }) {
  const isEdit = Boolean(initial?.id)
  const [type, setType] = useState(initial?.type || 'expense')
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amount_cents) : '')
  const [description, setDescription] = useState(initial?.description || '')
  const [merchant, setMerchant] = useState(initial?.merchant || '')
  const [categoryId, setCategoryId] = useState(
    initial?.category_id != null ? String(initial.category_id) : '',
  )
  const [occurredOn, setOccurredOn] = useState(initial?.occurred_on || todayISO())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const amountRef = useRef(null)

  useEffect(() => {
    amountRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const options = useMemo(() => {
    const matching = categories.filter((c) => c.kind === type)
    return matching.length ? matching : categories
  }, [categories, type])

  // keep the selected category consistent with the type toggle
  useEffect(() => {
    if (!categoryId) return
    const current = categories.find((c) => String(c.id) === categoryId)
    if (current && current.kind !== type) setCategoryId('')
  }, [type, categories, categoryId])

  const submit = async (event) => {
    event.preventDefault()
    const cents = centsFromInput(amount)
    if (!cents) return setError('Enter an amount greater than zero.')
    if (!description.trim()) return setError('Add a short description.')

    setSaving(true)
    setError('')
    try {
      await onSubmit({
        amount_cents: cents,
        type,
        description: description.trim(),
        merchant: merchant.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        occurred_on: occurredOn,
      })
    } catch (err) {
      setError(err.message || 'Could not save this transaction.')
      setSaving(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{isEdit ? 'Edit transaction' : 'New transaction'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="modal-body">
          <div className="segmented">
            <button
              type="button"
              className={`expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => setType('expense')}
            >
              Expense
            </button>
            <button
              type="button"
              className={`income ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
            >
              Income
            </button>
          </div>

          <div className="field">
            <label htmlFor="amount">Amount ({currency})</label>
            <div className="amount-input">
              <span className="cur">{currency === 'USD' ? '$' : currency}</span>
              <input
                id="amount"
                ref={amountRef}
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              placeholder="e.g. Weekly groceries"
              maxLength={120}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Uncategorised</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={occurredOn}
                max={todayISO()}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="merchant">Merchant (optional)</label>
            <input
              id="merchant"
              placeholder="e.g. Whole Foods"
              maxLength={80}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <div className="spacer" />
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <IconSpinner size={14} className="spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </form>
    </div>
  )
}
