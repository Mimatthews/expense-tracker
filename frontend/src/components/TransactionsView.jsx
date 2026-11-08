import { money } from '../lib/format.js'
import TxTable from './TxTable.jsx'
import { IconDownload, IconPlus, IconSearch } from './Icons.jsx'

export default function TransactionsView({
  items,
  total,
  categories,
  currency,
  loading,
  filters,
  setFilters,
  onNew,
  onEdit,
  onDelete,
  onExport,
}) {
  const { search, categoryId, type, sort, limit, offset } = filters

  const update = (patch) => setFilters({ ...filters, ...patch, offset: 0 })

  const page = Math.floor(offset / limit) + 1
  const pages = Math.max(1, Math.ceil(total / limit))

  const catChips = categories.slice(0, 7)

  return (
    <>
      <div className="tx-toolbar">
        <div className="search">
          <IconSearch size={14} />
          <input
            placeholder="Search description or merchant…"
            value={search}
            onChange={(e) => update({ search: e.target.value })}
            aria-label="Search transactions"
          />
        </div>

        <select
          className="select"
          value={categoryId}
          onChange={(e) => update({ categoryId: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          <option value="0">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="select"
          value={type}
          onChange={(e) => update({ type: e.target.value })}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>

        <select
          className="select"
          value={sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          aria-label="Sort"
        >
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Highest amount</option>
          <option value="amount_asc">Lowest amount</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-sm" onClick={onExport} disabled={!total} title="Download CSV">
            <IconDownload size={14} /> CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNew}>
            <IconPlus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {catChips.map((c) => (
          <button
            key={c.id}
            className={`chip ${String(categoryId) === String(c.id) ? 'active' : ''}`}
            onClick={() =>
              update({ categoryId: String(categoryId) === String(c.id) ? '' : String(c.id) })
            }
          >
            <span className="swatch" style={{ background: c.color }} />
            {c.name}
          </button>
        ))}
        {categoryId && (
          <button className="chip" onClick={() => update({ categoryId: '' })}>
            Clear ✕
          </button>
        )}
      </div>

      <div className="table-shell">
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 34 }} />
            ))}
          </div>
        ) : (
          <TxTable
            items={items}
            categories={categories}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
            sort={sort}
            onSort={(next) => setFilters({ ...filters, sort: next })}
            emptyAction={
              <button className="btn btn-primary btn-sm" onClick={onNew}>
                <IconPlus size={14} /> Add transaction
              </button>
            }
          />
        )}

        {total > 0 && (
          <div className="pager">
            <span>
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <span className="spacer" />
            <button
              className="btn btn-sm"
              disabled={offset === 0}
              onClick={() => setFilters({ ...filters, offset: Math.max(0, offset - limit) })}
            >
              Previous
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              className="btn btn-sm"
              disabled={offset + limit >= total}
              onClick={() => setFilters({ ...filters, offset: offset + limit })}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <p style={{ color: 'var(--text-faint)', fontSize: 11.5, marginTop: 12 }}>
        Totals shown in {currency}. Filtered page total:{' '}
        <strong style={{ color: 'var(--text-dim)' }}>
          {money(
            items.reduce(
              (sum, t) => sum + (t.type === 'expense' ? -t.amount_cents : t.amount_cents),
              0,
            ),
            currency,
          )}
        </strong>
      </p>
    </>
  )
}
