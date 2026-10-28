<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Multi-tenancy: every app table is scoped by `org_id` via RLS using `public.current_org_id()`; a BEFORE INSERT trigger fills `org_id`, so client inserts omit it. Why: one org per signup, isolation enforced in the database.
- Signup trigger `handle_new_user` creates the organization, the owner profile and calls `seed_demo_data(org)`. Why: new accounts see realistic data immediately.
- Profile `role` is only writable by service role (column-level grant on `full_name` only). Why: prevent self privilege escalation.
- App pages live under `src/routes/_authenticated/` and read data with the browser client + TanStack Query (`src/lib/data.ts`). Why: RLS-scoped reads, client-only gate.
