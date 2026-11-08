import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { money, monthLabel, dayLabel } from '../lib/format.js'

/* Flat instrument palette: one ink blue for spending, one paper-muted grey for
   income, no gradients, no rounded glow. Grid lines are 1px hairlines. */
export const INK = '#7c93b8'
export const PAPER = '#5c646f'
const GRID = '#20252d'

const axis = {
  stroke: 'transparent',
  tick: { fill: '#767e8b', fontSize: 10.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  tickLine: false,
  axisLine: false,
}

function Tip({ active, payload, label, currency, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      {label ? <div className="tooltip-label">{label}</div> : null}
      {payload.map((p) => (
        <div className="tooltip-row" key={p.dataKey || p.name}>
          <span className="swatch" style={{ background: p.color || p.payload?.color }} />
          <span>{p.name}</span>
          <span className="val">
            {formatter ? formatter(p.value, p) : money(p.value, currency)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------- month-over-month trend */
export function TrendChart({ data, currency }) {
  const rows = useMemo(
    () =>
      data.map((d) => ({
        label: monthLabel(d.month, { short: true }).replace(/\s\d{4}$/, ` ’${d.month.slice(2, 4)}`),
        expense: d.expense_cents / 100,
        income: d.income_cents / 100,
        month: d.month,
      })),
    [data],
  )

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis
            {...axis}
            width={62}
            tickFormatter={(v) => money(v * 100, currency, { compact: true })}
          />
          <Tooltip content={<Tip currency={currency} />} cursor={{ stroke: '#333b46', strokeWidth: 1 }} />
          <Area
            type="linear"
            dataKey="income"
            name="Income"
            stroke={PAPER}
            strokeWidth={1.25}
            strokeDasharray="3 3"
            fill={PAPER}
            fillOpacity={0.06}
            dot={false}
            activeDot={{ r: 2.5, strokeWidth: 0, fill: PAPER }}
          />
          <Area
            type="linear"
            dataKey="expense"
            name="Spending"
            stroke={INK}
            strokeWidth={1.6}
            fill={INK}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 2.5, strokeWidth: 0, fill: INK }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------- daily spending bars */
export function DailyChart({ data, currency }) {
  const rows = useMemo(
    () =>
      data.map((d) => ({
        label: String(Number(d.day.slice(8))),
        day: d.day,
        expense: d.expense_cents / 100,
      })),
    [data],
  )

  return (
    <div className="chart-wrap daily">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 6, right: 6, left: -4, bottom: 0 }} barCategoryGap={2}>
          <XAxis dataKey="label" {...axis} interval={Math.max(0, Math.floor(rows.length / 10) - 1)} />
          <YAxis
            {...axis}
            width={58}
            tickFormatter={(v) => money(v * 100, currency, { compact: true })}
          />
          <Tooltip
            content={
              <Tip
                currency={currency}
                formatter={(v, p) => money(v * 100, currency)}
              />
            }
            cursor={{ fill: 'rgba(255,255,255,0.028)' }}
            labelFormatter={(_, payload) => (payload?.[0] ? dayLabel(payload[0].payload.day) : '')}
          />
          <Bar dataKey="expense" name="Spent" radius={0} maxBarSize={11}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.expense > 0 ? INK : GRID} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ---------------------------------------------- category donut + legend */
export function CategoryDonut({ slices, total, currency, onSelect, selectedId }) {
  const data = useMemo(
    () =>
      slices.map((s) => ({
        name: s.name,
        value: s.total_cents / 100,
        color: s.color,
        id: s.category_id,
        share: s.share,
      })),
    [slices],
  )

  if (!data.length) {
    return <div className="empty" style={{ padding: 40 }}>No spending recorded for this month.</div>
  }

  return (
    <>
      <div className="donut-shell">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="76%"
              outerRadius="96%"
              paddingAngle={0.6}
              stroke="#0e1014"
              strokeWidth={1}
              startAngle={90}
              endAngle={-270}
              onClick={(entry) => onSelect?.(selectedId === entry.id ? null : entry.id)}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.color}
                  opacity={selectedId && selectedId !== d.id ? 0.22 : 1}
                  style={{ cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <Tip
                  currency={currency}
                  formatter={(v) => money(v * 100, currency)}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <div className="label">{selectedId ? 'Selected' : 'Total spent'}</div>
          <div className="value">
            {money(
              selectedId
                ? slices.find((s) => s.category_id === selectedId)?.total_cents || 0
                : total,
              currency,
              { compact: true },
            )}
          </div>
        </div>
      </div>

      <div className="legend">
        {slices.slice(0, 6).map((s) => (
          <div
            key={s.category_id ?? 'none'}
            className={`legend-row ${selectedId === s.category_id ? 'selected' : ''}`}
            onClick={() => onSelect?.(selectedId === s.category_id ? null : s.category_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.(selectedId === s.category_id ? null : s.category_id)
              }
            }}
          >
            <span className="swatch" style={{ background: s.color }} />
            <span className="legend-name">{s.name}</span>
            <span className="legend-val">{money(s.total_cents, currency)}</span>
            <span className="legend-share">{s.share.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </>
  )
}
