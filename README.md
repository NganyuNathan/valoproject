# InternPath — Student Internship Portal

A full-stack internship portal built with **React (Create React App)** and **Supabase**. Students discover and apply for internships; admins manage internships, companies, students, and applications.

## Stack
- React 18 (CRA, JavaScript only)
- React Router DOM v6
- Supabase (Postgres, Auth, Storage, Realtime)
- Framer Motion, React Icons, Chart.js, Axios-ready, React Hot Toast
- Plain CSS with a shared design-token system (`src/styles/variables.css`)

## 1. Install dependencies
```bash
npm install
```

## 2. Create your Supabase project
1. Go to [supabase.com](https://supabase.com) → New project.
2. In the SQL Editor, run **`supabase/schema.sql`** from this repo. It creates all tables, enables Row Level Security, and adds the notification triggers.
3. In **Storage**, create four buckets: `avatars`, `resumes`, `cover-letters`, `company-logos`.
   - Make `avatars` and `company-logos` **public**.
   - Keep `resumes` and `cover-letters` **private** — access them only via signed URLs or through your own RLS-backed storage policies.
4. In **Authentication → Providers**, enable **Email** and (optionally) **Google** for "Continue with Google".
5. Create your first admin: sign up normally through the app, then in the SQL editor run:
   ```sql
   update profiles set role = 'admin' where email = 'you@yourcompany.com';
   ```

## 3. Configure environment variables
```bash
cp .env.example .env
```
Fill in `.env` with your project's URL and anon key (Supabase Dashboard → Project Settings → API).

## 4. Run locally
```bash
npm start
```
Visit `http://localhost:3000`.

## 5. Build for production
```bash
npm run build
```
Deploy the `build/` folder to Vercel, Netlify, or any static host.

## Project structure
```
src/
├── components/   Navbar, Footer, InternshipCard, SearchBar, Filters,
│                 Sidebar, Charts, ProtectedRoute, DashboardLayout, ErrorBoundary...
├── context/      AuthContext (session + profile + role), InternshipContext (search/filter state)
├── hooks/        useDebounce, useTheme, useNotifications
├── pages/        Landing, Login, Register, ForgotPassword, ResetPassword,
│                 StudentDashboard/*, AdminDashboard/*, Profile, InternshipDetails,
│                 Applications, Settings, Companies, Static (About/Contact/Privacy/Terms)
├── services/     supabase.js + one service module per table (auth, internships,
│                 applications, companies, students, announcements)
├── styles/       variables.css (design tokens) + global.css
├── utils/        validators.js, formatters.js
├── App.js        Route tree, providers, Suspense/error boundary
├── routes.js     Lazy-loaded page imports (code splitting)
└── index.js      Entry point
```

## Roles & access
- **Visitor** — browse/search/filter internships and companies, no write access (enforced by RLS: `status = 'published'` is the only visible internship state).
- **Student** — full self-service: profile, resume/cover letter uploads, apply, save, track applications, notifications. RLS restricts every student-owned table to `auth.uid()`.
- **Admin** — full CRUD on internships, companies, students, and applications, plus reports and announcements. RLS grants admins access via the `is_admin()` helper function, checked against `profiles.role`.

## Notes
- Notifications are created automatically by Postgres triggers (`trg_application_status_change`, `trg_new_announcement`) and streamed to the UI in real time via Supabase Realtime (`useNotifications` hook).
- Dark mode is a CSS custom-property swap on `[data-theme="dark"]`, toggled from Settings and persisted to `localStorage`.
- CSV export for applications and reports happens client-side (no server function needed).
