# على رفوف المساجد
### *On the Shelves of Mosques*

> معظم المساجد يكون بها مكتبة ثرية بالكتب — ولا يكاد يقرأها أحد وهي تحت التراب على رفوف المساجد.
>
> *"Most mosques have a rich library of books — yet almost no one reads them, buried under dust on mosque shelves."*

---

## What is this?

**على رفوف المساجد** is a community-driven platform that catalogs books found in mosque libraries across Egypt, making them searchable and discoverable by anyone — from a single, easy-to-use interface.

Anyone can browse. Volunteers catalog. Admins moderate.

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Planning & Requirements | ✅ Complete |
| 2 | Database Design | ✅ Complete |
| 3 | Wireframes | ✅ Skipped — merged into Phase 4 |
| 4 | UI Design & Prototyping | 🔄 In progress |
| 5 | Dev Environment Setup | ❌ Not started |
| 6 | Implementation | ❌ Not started |
| 7 | Testing | ❌ Not started |
| 8 | Deployment | ❌ Not started |

---

## Prototyping Progress (Phase 4)

| Page | Status | Notes |
|------|--------|-------|
| Login / Register | ✅ Production-ready | Desktop + mobile. Serves as the design language reference. |
| Submit a Book | ✅ Production-ready | Desktop + mobile + tablet. Missing nav. |
| Browse (Books & Mosques) | ✅ Production-ready | Missing nav. |
| Onboarding | 🔄 Needs fix | Responsiveness incomplete on tablet and phone. |
| Profile | 🔄 Needs fix | Style language inconsistent with rest of platform; duplicate UI elements present. |
| Requests (Admin) | 🔄 Needs fix | Multiple UI/flow bugs; misplaced top bar. |
| **Navigation (Side Menu + Bottom Tabs)** | ❌ Not started | **Current priority — blocker for all other pages.** |
| Book Detail | ❌ Not started | After nav is complete. |
| Mosque Detail | ❌ Not started | After nav is complete. |
| About | ❌ Not started | After nav is complete. |

### Prototyping Priority Order
1. **Build the unified navigation component** (side menu on desktop, bottom tabs on mobile)
2. Fix the Requests page
3. Fix the Profile page
4. Fix the Onboarding page responsiveness
5. Prototype Book Detail, Mosque Detail, and About pages

---

## Key Design Decisions

| Decision | Detail |
|----------|--------|
| **Home page** | `/browse` is the platform entry point for all users. No separate home page in V1. |
| **Navigation — Desktop** | Side menu (dark green, RTL-aware) |
| **Navigation — Mobile** | Bottom tab bar (Browse, Submit, Profile) |
| **Requests page access** | Accessed from the Profile page (admin only) — not in the main nav |
| **Guest location** | Stored in session cookie only — does not persist across sessions |
| **Auth user location** | Saved to the `users` table profile record |
| **Feedback form** | Stored in a `feedback` table in the database (see `schema.sql`) |
| **Design language** | Forest green `#1B3A2D`, Cream `#F5EFE0`, Gold `#C9A84C`, Cairo font |

---

## Documentation

| File | Description |
|------|-------------|
| [`docs/requirements.md`](docs/requirements.md) | Full functional & non-functional requirements |
| [`docs/user-stories.md`](docs/user-stories.md) | User stories with acceptance criteria |
| [`docs/architecture.md`](docs/architecture.md) | Tech stack, folder structure, API design |
| [`docs/sitemap.md`](docs/sitemap.md) | Platform pages and navigation structure |
| [`docs/user-flows.md`](docs/user-flows.md) | Step-by-step user journey flows |
| [`docs/roadmap.md`](docs/roadmap.md) | Development phases and milestones |
| [`schema.sql`](schema.sql) | Full database schema |
| [`diagrams/erd.html`](diagrams/erd.html) | Entity-relationship diagram (visual) |
| [`diagrams/sitemap.html`](diagrams/sitemap.html) | Sitemap diagram (visual) |
| [`diagrams/user-flows.html`](diagrams/user-flows.html) | User flow diagram (visual) |

---

## Tech Stack (Summary)

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, TypeScript |
| Framework | Next.js (App Router) |
| Database & Auth | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Version Control | GitHub |
| Design | Figma |

→ See [`docs/architecture.md`](docs/architecture.md) for full details and reasoning.

---

## Team & Tools

| Tool | Purpose |
|------|---------|
| Telegram | Team communication |
| Notion | Task tracking & planning |
| GitHub | Code collaboration |
| Figma | UI/UX design |

---

## Quick Links

- 🎨 [Figma Designs](https://www.figma.com/design/idcOa4g4eqkEEAVvnpzdFT)
- 🗃️ [Database Design (dbdiagram.io)](https://dbdiagram.io/d/69ed1619ddb9320fdc504cdb)
- 📋 [Notion Planning Board](https://www.notion.so/34d12a48ee90806a9b4eebb79092ebf5)

---

*على رفوف المساجد — bringing mosque knowledge into the light.*
