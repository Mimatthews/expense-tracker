import { money, relativeDay } from '../lib/format.js'
import { IconEdit, IconInbox, IconTrash } from './Icons.jsx'

const SORTERS = {
  date: 'date_desc',
  amount: 'amount_desc',
}

export default function TxTable({
  items,
  categories,
  currency,
  onEdit,
  onDelete,
  sort,
  onSort,
  emptyAction,
  compact = false,
}) {
  const catOf = (tx) =>
    categories.find((c) => c.id === tx.category_id) || {
      name: 'Uncategorised',
      color: '#64748b',
    }

  if (!items.length) {
    return (
      <div className="empty">
        <IconInbox size={34} />
        <h3>Nothing here yet</h3>
        <p>Add your first transaction to start tracking spending.</p>
        {emptyAction}
      </div>
    )
  }

  const clickable = (key) => {
    if (!onSort) return {}
    const isActive = sort === SORTERS[key] || sort === SORTERS[key].replace('desc', 'asc')
    return {
      className: 'sortable',
      onClick: () =>
        onSort(
          sort === `${key}_desc` || !isActive ? `${key}_asc` : `${key}_desc`,
        ),
      title: 'Click to sort',
    }
  }

  return (
    <table className="tx">
      <thead>
        <tr>
          <th {...clickable('date')}>Date</th>
          <th>Description</th>
          <th className="col-hide-sm">Category</th>
          <th {...clickable('amount')} className={`num ${onSort ? 'sortable' : ''}`}>
            Amount
          </th>
          <th style={{ width: 76 }}></th>
        </tr>
      </thead>
      <tbody>
        {items.map((tx) => {
          const cat = catOf(tx)
          return (
            <tr key={tx.id}>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', fontSize: 12.5 }}>
                {relativeDay(tx.occurred_on)}
              </td>
              <td>
                <div className="tx-desc">{tx.description}</div>
                {tx.merchant && !compact && <div className="tx-merchant">{tx.merchant}</div>}
              </td>
              <td className="col-hide-sm">
                <span className="cat-pill">
                  <span className="swatch" style={{ background: cat.color }} />
                  {cat.name}
                </span>
              </td>
              <td className={`num amount ${tx.type}`}>
                {tx.type === 'income' ? '+' : '−'}
                {money(tx.amount_cents, currency)}
              </td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Edit"
                    aria-label={`Edit ${tx.description}`}
                    onClick={() => onEdit(tx)}
                  >
                    <IconEdit size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title="Delete"
                    aria-label={`Delete ${tx.description}`}
                    onClick={() => onDelete(tx)}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
