# Start here — putting this on GitHub

Two separate things people both call "on my GitHub":

| Goal | What it is | Where it shows up |
| --- | --- | --- |
| **A. The project repo** | Your code, README, screenshots | `github.com/YOUR-USERNAME/expense-tracker` |
| **B. The live site** | Static page in `docs/` | `YOUR-USERNAME.github.io/expense-tracker` |
| **C. Profile README** | A repo named exactly like your username | The top of `github.com/YOUR-USERNAME` |

Do A → B → C. A is required; B and C are the things people actually click.

---

## A · Push the project (5 min)

### 0. Before you push: is anything sensitive in there?

The demo database `backend/data/expenses.db` is git-ignored on purpose — never commit
real transaction data. Confirm nothing unwanted is staged:

```bash
cd expense-tracker
git init
git add -A
git status --short | grep -E '\.db|node_modules|\.venv' || echo "clean ✔"
```

### 1. Make it yours

```bash
# replace my placeholders with your handle (Linux)
grep -rl 'YOUR-USERNAME' . --exclude-dir=node_modules --exclude-dir=.venv \
  | xargs sed -i 's/YOUR-USERNAME/your-handle/g'

# macOS
grep -rl 'YOUR-USERNAME' . --exclude-dir=node_modules --exclude-dir=.venv \
  | xargs sed -i '' 's/YOUR-USERNAME/your-handle/g'

# and your name in the licence
sed -i 's/Your Name/Your Real Name/' LICENSE
```

### 2. Commit and push

```bash
git add -A
git commit -m "Ledger: expense tracker (React + FastAPI + SQLite)"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/expense-tracker.git
git push -u origin main
```

Use an **empty repository** on GitHub (no README, no .gitignore, no licence) so the
first push doesn't conflict. If you already created one with a README:

```bash
git pull --rebase origin main
git push -u origin main
```

> **Auth note:** GitHub stopped accepting account passwords for git over HTTPS in 2021.
> Use a **personal access token** (Settings → Developer settings → Personal access tokens
> → Fine-grained tokens, `Contents: Read and write`) as the password, or install the
> [GitHub CLI](https://cli.github.com) and run `gh auth login` once.

### 3. Make the repo look finished (30 sec, high impact)

On the repo page, click the gear ⚙ next to **About** (top right):

- **Description:** `Full-stack expense tracker — React, FastAPI, SQLite. CRUD, categories, monthly summaries and charts.`
- **Website:** your Pages URL once step B is done
- **Topics:** `expense-tracker` `react` `fastapi` `sqlite` `python` `charts` `full-stack` `portfolio-project`

Then **Releases → Draft a new release → `v1.0.0`**. A tagged repo reads as maintained.

---

## B · Turn on the live page (1 min)

`docs/` is a self-contained static site — no build step, images included, 1.4 MB total.

1. Repo → **Settings** → **Pages**
2. **Source:** `Deploy from a branch`
3. **Branch:** `main` · **Folder:** `/docs` → **Save**
4. Wait ~60 seconds, reload the Pages settings screen, and the URL appears:
   `https://YOUR-USERNAME.github.io/expense-tracker/`

If you see a 404 for a minute, that's normal — first deploy takes a moment. Check
**Actions** for a `pages build and deployment` run if it stays broken.

**Important:** GitHub Pages only serves static files. The FastAPI app can't run there —
the page is a portfolio showcase, and the app runs locally (`uvicorn` + `npm run dev`).
Don't claim the demo is live unless you deploy the API somewhere (Render/Railway/Fly) and
point `VITE_API_URL` at it.

---

## C · Put it on your profile (5 min)

So that `github.com/YOUR-USERNAME` itself showcases the project:

1. Create a **new public repo named exactly your username**
   (e.g. `github.com/ada` → repo `ada`). GitHub shows a special banner confirming it's
   the profile README repo.
2. Add a `README.md`. I've prepared one for you: **`github-profile-README.md`** in the
   workspace root — copy its contents, replace `YOUR-USERNAME` / `Your Name` / email.
3. Commit. It appears instantly at the top of your profile.

It embeds `docs/social-preview.png` from the project repo, so do step A first.

### Also worth doing, in order

1. **Pin the repo:** profile → **Customize your pins** → tick `expense-tracker`.
2. **Pin order matters** — pinned repos are the first thing a recruiter reads.
3. **Add the Pages link to your résumé/LinkedIn** as "Live demo".
4. **Set a profile photo and bio** — an empty-avatar profile with one repo reads as a
   throwaway account regardless of code quality.

---

## D · When you change the code later

```bash
git add -A
git commit -m "Add budgets per category"
git push
```

Pages redeploys automatically, and CI (`.github/workflows/ci.yml`) runs the 8 backend
tests, an API smoke test, and the frontend build. The badge at the top of the README
turns red if you break something — which is the point of having it.

---

## Screenshots

`docs/screenshots/` holds the five images the README and landing page use. Regenerate
them whenever the UI changes, with the app running on `localhost:5173`:

| File | What to capture |
| --- | --- |
| `dashboard.png` | Dashboard, full page, 1440px wide |
| `transactions.png` | Transactions tab, full page |
| `categories.png` | Categories tab |
| `modal.png` | New transaction dialog open |
| `mobile.png` | Dashboard at 420px wide (crop to the first ~1500px) |

`docs/social-preview.png` is the 1200×630 card GitHub shows when the repo is shared —
generated with the script in this message's history, or re-export from any 1200×630 canvas.

---

## Checklist

- [ ] `git status` shows no `.db`, `node_modules`, or `.venv` files
- [ ] Placeholders replaced (`YOUR-USERNAME`, `Your Name`)
- [ ] Pushed to a **public** repo
- [ ] About panel filled: description, website, topics
- [ ] Pages enabled on `main` / `/docs`, URL loads
- [ ] Repo pinned on your profile
- [ ] Profile README repo created (`YOUR-USERNAME/YOUR-USERNAME`)
- [ ] `v1.0.0` release tagged
- [ ] CI badge green
