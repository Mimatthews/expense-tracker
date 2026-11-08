import { money, monthLabel } from '../lib/format.js'
import { IconEdit, IconPlus } from './Icons.jsx'

export default function CategoriesView({ categories, summary, currency, month, onNew, onEdit }) {
  const totals = {
    expense: summary?.expense_cents || 0,
    income: summary?.income_cents || 0,
  }

  const groups = [
    { kind: 'expense', title: 'Spending categories' },
    { kind: 'income', title: 'Income categories' },
  ]

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 13 }}>
          {categories.length} categories · totals for {monthLabel(month)}
        </p>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={onNew}>
          <IconPlus size={14} /> New category
        </button>
      </div>

      {groups.map((group) => {
        const list = categories.filter((c) => c.kind === group.kind)
        if (!list.length) return null
        return (
          <section key={group.kind} style={{ marginBottom: 26 }}>
            <h3 className="card-title" style={{ marginBottom: 10 }}>
              {group.title}
              <span className="spacer" />
              <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>
                {list.length}
              </span>
            </h3>

            <div className="grid cat-grid">
              {list.map((c) => {
                const share = totals[c.kind]
                  ? (c.month_total_cents / totals[c.kind]) * 100
                  : 0
                return (
                  <div className="card cat-card" key={c.id}>
                    <div className="cat-card-head">
                      <div className="cat-dot" style={{ background: c.color }}>
                        {c.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="cat-card-name">{c.name}</div>
                        <div className="cat-card-kind">{c.kind}</div>
                      </div>
                      <button
                        className="icon-btn"
                        style={{ marginLeft: 'auto' }}
                        onClick={() => onEdit(c)}
                        title={`Edit ${c.name}`}
                        aria-label={`Edit ${c.name}`}
                      >
                        <IconEdit size={14} />
                      </button>
                    </div>

                    {/* the bar encodes share of the month; the tick beside the
                        name carries the category's identity colour */}
                    <div className="bar-track" title={`${share.toFixed(0)}% of the month`}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.min(100, share)}%`,
                          background: c.kind === 'income' ? 'var(--green)' : c.color,
                        }}
                      />
                    </div>

                    <div className="cat-card-foot">
                      <span className="cat-card-total">{money(c.month_total_cents, currency)}</span>
                      <span className="cat-card-meta">
                        {c.transaction_count} tx · {share.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </>
  )
}
