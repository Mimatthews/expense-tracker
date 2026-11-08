import { money, monthLabel, pct, signedMoney } from '../lib/format.js'
import { CategoryDonut, DailyChart, TrendChart } from './Charts.jsx'
import TxTable from './TxTable.jsx'
import { IconTrendDown, IconTrendUp } from './Icons.jsx'

function StatCard({ label, value, tone, foot }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone || ''}`}>{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  )
}

export default function Dashboard({
  summary,
  trend,
  recent,
  categories,
  currency,
  month,
  onNew,
  onEdit,
  onDelete,
  selectedCategory,
  onSelectCategory,
  onViewAll,
  loading,
}) {
  const s = summary

  if (loading && !s) {
    return (
      <div className="grid stats">
        {[0, 1, 2, 3].map((i) => (
          <div className="card" key={i}>
            <div className="skeleton" style={{ height: 11, width: '45%', marginBottom: 14 }} />
            <div className="skeleton" style={{ height: 26, width: '70%' }} />
          </div>
        ))}
      </div>
    )
  }

  if (!s) return null

  const savingRate = s.income_cents > 0 ? (s.net_cents / s.income_cents) * 100 : null
  const up = (s.change_pct ?? 0) > 0

  return (
    <>
      <div className="grid stats">
        <StatCard
          label="Spent this month"
          value={money(s.expense_cents, currency)}
          foot={
            s.change_pct === null ? (
              <span>No spending logged in {monthLabel(shiftKey(s.month), { short: true })}</span>
            ) : (
              <>
                <span className={`delta ${up ? 'up' : s.change_pct === 0 ? 'flat' : 'down'}`}>
                  {up ? <IconTrendUp size={11} /> : <IconTrendDown size={11} />}
                  {pct(s.change_pct)}
                </span>
                <span>vs {monthLabel(shiftKey(s.month), { short: true })}</span>
              </>
            )
          }
        />
        <StatCard
          label="Income"
          value={money(s.income_cents, currency)}
          foot={
            <span>{signedMoney(s.income_cents - s.prev_income_cents, currency)} vs last month</span>
          }
        />
        <StatCard
          label="Net cash flow"
          value={`${s.net_cents < 0 ? '−' : ''}${money(Math.abs(s.net_cents), currency)}`}
          tone={s.net_cents >= 0 ? 'pos' : 'neg'}
          foot={
            <span>
              {savingRate === null ? 'Add income to see savings rate' : `${savingRate.toFixed(0)}% savings rate`}
            </span>
          }
        />
        <StatCard
          label="Transactions"
          value={s.transaction_count}
          foot={
            <span>
              {s.top_category ? `Top: ${s.top_category}` : 'No spending logged'}
            </span>
          }
        />
      </div>

      <div className="grid charts-row">
        <div className="card">
          <h3 className="card-title">
            Cash flow · last {trend.length} months
            <span className="spacer" />
            <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>
              income vs spending
            </span>
          </h3>
          <TrendChart data={trend} currency={currency} />
        </div>

        <div className="card">
          <h3 className="card-title">
            Where it went · {monthLabel(s.month, { short: true })}
          </h3>
          <CategoryDonut
            slices={s.by_category}
            total={s.expense_cents}
            currency={currency}
            onSelect={onSelectCategory}
            selectedId={selectedCategory}
          />
        </div>
      </div>

      <div className="grid charts-row">
        <div className="card">
          <h3 className="card-title">
            Daily spending
            <span className="spacer" />
            <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-faint)' }}>
              avg {money(s.avg_expense_cents, currency)} / active day
            </span>
          </h3>
          <DailyChart data={s.daily} currency={currency} />
        </div>

        <div className="card">
          <h3 className="card-title">Top merchants</h3>
          {s.top_merchants.length === 0 && (
            <p style={{ color: 'var(--text-faint)', fontSize: 12.5, margin: 0 }}>
              No merchants recorded this month.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {s.top_merchants.map((m) => {
              const width = (m.total_cents / (s.top_merchants[0]?.total_cents || 1)) * 100
              return (
                <div key={m.label}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 12.5,
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.label}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)' }}>
                      {money(m.total_cents, currency)}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${width}%`,
                        background: '#7c93b8',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 17px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 className="card-title" style={{ margin: 0 }}>
            Recent transactions
          </h3>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={onViewAll}>
            View all →
          </button>
        </div>
        <TxTable
          items={recent}
          categories={categories}
          currency={currency}
          onEdit={onEdit}
          onDelete={onDelete}
          compact
        />
      </div>
    </>
  )
}

function shiftKey(month) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
