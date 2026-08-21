**System Architecture & UI Refactor Brief: "On the Shelves of Mosques" (على رفوف المساجد)**

**Project Goal:**

An open-access digital library cataloging underutilized physical books resting in mosques to make them accessible to local communities.

---

#### 1. Roles & Verification Workflow (Clarification & Core Logic)

Ensure the following role permissions are strictly enforced:

* **Admin:** Full access. Direct upload (bypasses queue), views submitted request queue, approves/rejects requests, manages users.
* **Volunteer (المتطوع):** Direct upload privileges for cataloging books. Cannot verify or moderate other users' request queues.
* **Unauthenticated Visitor / Guest (New Requirement):** Can browse, search, and **submit new book/mosque entries directly without logging in or losing state**.
* *Guest Submissions:* Route directly to the pending verification queue for Admin approval.
* *UX Fix:* Completely eliminate the forced login redirect on the book submission form. Anyone can fill out the form and submit immediately, even if not signed-in.



---

#### 2. Main Browse Page (UI/UX & Layout Redesign)

The current homepage is overly tall due to excessive vertical stacking, leaving horizontal space wasted on desktop displays. Refactor the layout into a balanced, responsive grid.

* **Database Wiring:** Connect the browse page components directly to live database tables (Supabase/PostgreSQL), replacing all static prototype mockup data.
* **Hero Section (Combined Above-the-Fold):**
* *Left/Side Column:* Impact stats banner (Books count, Mosques count, Governorates count) alongside a prominent CTA card: *"Have a book in your local mosque? Add it now"* (هل لديك كتاب في مسجدك؟ أضفه الآن).
* *Right/Main Column:* Location banner ("حدد موقعك لعرض الكتب القريبة منك أولاً") integrated cleanly alongside the main search bar.


* **Unified Control Bar (Horizontal Filter Strip):**
* Combine search inputs, entity toggles (Books vs. Mosques), and geographic dropdowns (Country $\rightarrow$ Governorate $\rightarrow$ City) into a single sticky horizontal filter bar above the content grid.


* **Content Grid:** Display books/mosques in a responsive multi-column grid layout (cards) below the filter bar.

---

#### 3. Geographic Scaling & Location Detection Strategy

Currently, the application is hardcoded for Egypt and uses a redundant dual-location system (Interactive Map + Manual Governorate/City dropdowns). Refactor this to scale internationally across Muslim-majority countries. And it also has hardcoded governrates and Cities, which is not ideal for a project that is built to be scaled.

* **Multi-Country Support:**
* Update database schemas, submission forms, browse filters, and user profiles to support multi-country selection (e.g., Egypt, Saudi Arabia, Sudan, Morocco, etc.).
* Cascade location pickers dynamically: **Country $\rightarrow$ Governorate/State $\rightarrow$ City**.


* **Unified Location Strategy (Map + Cascading Dropdowns):**
* *Why keep both:* Dropdowns ensure accurate administrative data grouping, while maps provide precise GPS coordinates for navigation.
* *Sync Logic:* Make them mutually synchronized. Picking a location on the Interactive Map auto-fills/estimates the Country/Governorate/City dropdowns using Reverse Geocoding. Conversely, choosing dropdowns centers the map view automatically on that city.



---

#### 4. SEO & GEO (Generative Engine Optimization) Strategy

Enhance discovery across traditional search engines (Google) and AI discovery tools (ChatGPT, Perplexity, Claude).

* **Metadata & Structure:**
* Implement dynamic OpenGraph and JSON-LD structured data (`Book`, `Library`, `Place`, `Schema.org/Schema`) on individual book and mosque pages.
* Include rich semantic descriptions in primary headers explaining the project mission: cataloging dormant mosque library assets.


* **Local SEO / GEO Targeting:**
* Auto-generate localized landing page routes (e.g., `/eg/cairo/mosques` or `/sa/riyadh/books`) to capture intent-based local queries ("كتب مساجد القاهرة", "المكتبات العامة في مساجد الرياض").



---

### Implementation Instructions for AI

1. Review the existing database schema for `books`, `mosques`, `locations`, and `pending_approvals` tables to accommodate the `country_id` field and unauthenticated submissions.
2. Refactor the submission page state handling first so guest users can submit without authentication redirects.
3. Redesign the Browse page layout utilizing CSS Grid/Flexbox to turn the vertical stack into a compact, responsive dashboard.
4. Set up the dynamic cascade for location dropdowns and sync them with the map pin listener.