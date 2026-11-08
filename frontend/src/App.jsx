import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './lib/api.js'
import {
  CURRENCIES,
  currentMonthKey,
  money,
  monthLabel,
  shiftMonth,
} from './lib/format.js'
import Dashboard from './components/Dashboard.jsx'
import TransactionsView from './components/TransactionsView.jsx'
import CategoriesView from './components/CategoriesView.jsx'
import TransactionModal from './components/TransactionModal.jsx'
import CategoryModal from './components/CategoryModal.jsx'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconDashboard,
  IconGitHub,
  IconList,
  IconPlus,
  IconTag,
  IconTrash,
} from './components/Icons.jsx'

const PAGE_SIZE = 25
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { id: 'transactions', label: 'Transactions', icon: IconList },
  { id: 'categories', label: 'Categories', icon: IconTag },
]

const emptyFilters = {
  search: '',
  categoryId: '',
  type: '',
  sort: 'date_desc',
  limit: PAGE_SIZE,
  offset: 0,
}

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [month, setMonth] = useState(currentMonthKey())
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('ledger.currency') || 'USD',
  )

  const [categories, setCategories] = useState([])
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [recent, setRecent] = useState([])
  const [txPage, setTxPage] = useState({ items: [], total: 0 })
  const [filters, setFilters] = useState(emptyFilters)

  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [online, setOnline] = useState(true)
  const [error, setError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [txModal, setTxModal] = useState(null) // null | {} | transaction
  const [catModal, setCatModal] = useState(null)
  const [toasts, setToasts] = useState([])
  const [confirm, setConfirm] = useState(null)

  const toastId = useRef(0)
  const pushToast = useCallback((message, tone = 'success') => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800)
  }, [])

  useEffect(() => {
    localStorage.setItem('ledger.currency', currency)
  }, [currency])

  /* ---------------------------------------------------------- loading */
  const loadCategories = useCallback(async () => {
    const data = await api.listCategories({ month })
    setCategories(data)
    return data
  }, [month])

  const loadSummary = useCallback(async () => {
    const data = await api.summary(month, 6)
    setSummary(data.summary)
    setTrend(data.trend)
  }, [month])

  const loadRecent = useCallback(async () => {
    const data = await api.listTransactions({ month, limit: 6 })
    setRecent(data.items)
  }, [month])

  const loadPage = useCallback(async () => {
    setTxLoading(true)
    try {
      const data = await api.listTransactions({
        month: month || undefined,
        search: filters.search || undefined,
        category_id: filters.categoryId === '' ? undefined : filters.categoryId,
        type: filters.type || undefined,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      })
      setTxPage({ items: data.items, total: data.total })
      setOnline(true)
      setError('')
    } catch (err) {
      setOnline(false)
      setError(err.message)
    } finally {
      setTxLoading(false)
    }
  }, [month, filters])

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([loadCategories(), loadSummary(), loadRecent(), loadPage()])
      setOnline(true)
      setError('')
    } catch (err) {
      setOnline(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadCategories, loadSummary, loadRecent, loadPage])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadCategories(), loadSummary(), loadRecent()])
      .then(() => {
        setOnline(true)
        setError('')
      })
      .catch((err) => {
        setOnline(false)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [loadCategories, loadSummary, loadRecent])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  /* --------------- clicking a donut slice jumps to filtered transactions */
  useEffect(() => {
    if (selectedCategory === null) return
    setFilters((f) => ({ ...f, categoryId: String(selectedCategory), offset: 0 }))
  }, [selectedCategory])

  /* ---------------------------------------------------------- mutations */
  const saveTransaction = async (payload) => {
    if (txModal?.id) {
      await api.updateTransaction(txModal.id, payload)
      pushToast('Transaction updated')
    } else {
      await api.createTransaction(payload)
      pushToast('Transaction added')
    }
    setTxModal(null)
    await refreshAll()
  }

  const askDeleteTransaction = (tx) => {
    setConfirm({
      title: 'Delete transaction?',
      body: `“${tx.description}” — ${money(tx.amount_cents, currency)}. This cannot be undone.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await api.deleteTransaction(tx.id)
          pushToast('Transaction deleted')
          await refreshAll()
        } catch (err) {
          pushToast(err.message, 'error')
        }
      },
    })
  }

  const saveCategory = async (payload) => {
    if (catModal?.id) {
      await api.updateCategory(catModal.id, payload)
      pushToast('Category updated')
    } else {
      await api.createCategory(payload)
      pushToast('Category created')
    }
    setCatModal(null)
    await refreshAll()
  }

  const askDeleteCategory = (cat) => {
    setCatModal(null)
    setConfirm({
      title: `Delete “${cat.name}”?`,
      body: `${cat.transaction_count || 0} transaction(s) in this category will be kept and marked uncategorised.`,
      confirmLabel: 'Delete category',
      onConfirm: async () => {
        try {
          await api.deleteCategory(cat.id)
          pushToast('Category deleted')
          await refreshAll()
        } catch (err) {
          pushToast(err.message, 'error')
        }
      },
    })
  }

  const exportCsv = async () => {
    try {
      const data = await api.listTransactions({
        month,
        search: filters.search || undefined,
        category_id: filters.categoryId === '' ? undefined : filters.categoryId,
        type: filters.type || undefined,
        sort: filters.sort,
        limit: 500,
        offset: 0,
      })
      const header = ['date', 'type', 'description', 'merchant', 'category', 'amount']
      const lines = data.items.map((t) =>
        [
          t.occurred_on,
          t.type,
          `"${t.description.replace(/"/g, '""')}"`,
          `"${(t.merchant || '').replace(/"/g, '""')}"`,
          `"${t.category_name || 'Uncategorised'}"`,
          (t.amount_cents / 100).toFixed(2),
        ].join(','),
      )
      const blob = new Blob([[header.join(','), ...lines].join('\n')], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger-${month}.csv`
      a.click()
      URL.revokeObjectURL(url)
      pushToast(`Exported ${data.items.length} transactions`)
    } catch (err) {
      pushToast(err.message, 'error')
    }
  }

  /* ---------------------------------------------------------- derived */
  const totalMonthIncome = summary?.income_cents || 0

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 18V9M10 18V5M16 18v-6M22 18v-9" />
            </svg>
          </div>
          <div>
            <div className="brand-name">Ledger</div>
            <div className="brand-sub">Expense tracker</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Workspace</div>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {id === 'transactions' && txPage.total > 0 && (
                <span className="nav-count">{txPage.total}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="conn-card">
            <span className={`dot ${online ? '' : 'off'}`} />
            <span>{online ? 'sqlite · connected' : 'api unreachable'}</span>
          </div>
          <div className="conn-card">
            <span>
              {summary ? money(summary.expense_cents, currency) : '—'} ·{' '}
              {monthLabel(month, { short: true })}
            </span>
          </div>
          <a
            className="nav-item"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12.5 }}
          >
            <IconGitHub size={15} />
            <span>View source</span>
          </a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {tab === 'dashboard'
                ? 'Overview'
                : tab === 'transactions'
                  ? 'Transactions'
                  : 'Categories'}
            </h1>
            <p className="page-sub">
              {tab === 'dashboard'
                ? `${monthLabel(month)} · ${summary?.transaction_count ?? 0} transactions, ${
                    money(totalMonthIncome, currency)
                  } in`
                : tab === 'transactions'
                  ? 'Create, edit, filter and export every transaction.'
                  : 'Colour-coded buckets that drive your spending breakdown.'}
            </p>
          </div>

          <div className="topbar-actions">
            <div className="month-switch">
              <button
                className="icon-btn"
                onClick={() => setMonth(shiftMonth(month, -1))}
                aria-label="Previous month"
              >
                <IconArrowLeft size={14} />
              </button>
              <strong>{monthLabel(month, { short: true })}</strong>
              <button
                className="icon-btn"
                onClick={() => setMonth(shiftMonth(month, 1))}
                aria-label="Next month"
                disabled={month >= currentMonthKey()}
                className={`icon-btn ${month >= currentMonthKey() ? 'is-disabled' : ''}`}
              >
                <IconArrowRight size={14} />
              </button>
            </div>

            <select
              className="select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button className="btn btn-primary" onClick={() => setTxModal({})}>
              <IconPlus size={15} /> New transaction
            </button>
          </div>
        </header>

        {error && (
          <div className="banner">
            <IconClose size={14} />
            <span>
              Can’t reach the API ({error}). Start the backend with{' '}
              <code>uvicorn app.main:app --reload</code> in <code>backend/</code>.
            </span>
          </div>
        )}

        {tab === 'dashboard' && (
          <Dashboard
            summary={summary}
            trend={trend}
            recent={recent}
            categories={categories}
            currency={currency}
            month={month}
            loading={loading}
            onNew={() => setTxModal({})}
            onEdit={(tx) => setTxModal(tx)}
            onDelete={askDeleteTransaction}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => {
              setSelectedCategory(id)
              if (id) setTab('transactions')
            }}
            onViewAll={() => setTab('transactions')}
          />
        )}

        {tab === 'transactions' && (
          <TransactionsView
            items={txPage.items}
            total={txPage.total}
            categories={categories}
            currency={currency}
            loading={txLoading}
            filters={filters}
            setFilters={setFilters}
            onNew={() => setTxModal({})}
            onEdit={(tx) => setTxModal(tx)}
            onDelete={askDeleteTransaction}
            onExport={exportCsv}
          />
        )}

        {tab === 'categories' && (
          <CategoriesView
            categories={categories}
            summary={summary}
            currency={currency}
            month={month}
            onNew={() => setCatModal({})}
            onEdit={(c) => setCatModal(c)}
          />
        )}
      </main>

      {txModal && (
        <TransactionModal
          initial={txModal.id ? txModal : null}
          categories={categories}
          currency={currency}
          onClose={() => setTxModal(null)}
          onSubmit={saveTransaction}
        />
      )}

      {catModal && (
        <CategoryModal
          initial={catModal.id ? catModal : null}
          onClose={() => setCatModal(null)}
          onSubmit={saveCategory}
          onDelete={askDeleteCategory}
        />
      )}

      {confirm && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="modal" style={{ width: 'min(400px, 100%)' }} role="dialog" aria-modal="true">
            <div className="modal-head">
              <IconTrash size={15} />
              <h2>{confirm.title}</h2>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 13 }}>{confirm.body}</p>
            </div>
            <div className="modal-foot">
              <div className="spacer" />
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={async () => {
                  const action = confirm.onConfirm
                  setConfirm(null)
                  await action()
                }}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <span className="ico">
              {t.tone === 'error' ? <IconClose size={14} /> : <IconCheck size={14} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
