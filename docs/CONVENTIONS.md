# SuperHIS Web UI — module page conventions

Read this fully before writing any code. Every module follows the same recipe so the app feels like one product.

## Architecture

- Next.js 15 App Router + TypeScript + Tailwind. **No extra libraries.** Plain `useState`/`useEffect` + `fetch` via the shared client.
- All backend calls go through the core client `lib/api.ts` → `apiFetch<T>(path, opts)`. It prefixes `/api/his`, attaches the Bearer token from localStorage, throws `ApiError` with the backend `detail` message, and auto-redirects to `/login` on 401. **Never call `fetch` directly.**
- Helpers in `lib/api.ts`: `buildQuery(params)` (returns `""` or `"?..."`, skips empty values) and `cleanBody(obj)` (strips `""`/`null`/`undefined` fields before POST/PUT/PATCH).
- Each module owns exactly:
  - `lib/api/<module>.ts` — typed interfaces + functions for its endpoints, importing `{ apiFetch, buildQuery, cleanBody }` from `@/lib/api`.
  - `app/<route>/**` — its pages.
- **Do NOT edit shared files**: `lib/api.ts`, `components/AppShell.tsx`, `components/ui.tsx`, `app/layout.tsx`, `next.config.ts`, `package.json`. Do not install packages.

## API contract

Your module's exact contract is in `docs/api/<module>.json` (extracted from the backend's OpenAPI spec): every path, method, query param, request body schema, and response schema. **Follow it exactly — field names included (some are intentionally misspelled, e.g. `nationallity`). Do not invent endpoints or fields.**

Notes:
- Backend responses are usually `{ "status": "success", ...payload }`; list endpoints return `{ status, total_found, data: [...] }`. Check your JSON file.
- List endpoints have no pagination — they return all matches; filters are query params.
- Errors arrive as `ApiError` with a Thai-ready `message`; just render `err.message`.

## Page recipe

Every module gets, as applicable:
1. **List page** (`app/<route>/page.tsx`): filter bar (inputs matching the endpoint's query params + ค้นหา/ล้าง buttons), result count, `TableShell` table with the most useful columns, status badges, loading/error/empty states. Row click or a "ดู" link goes to the detail page if the API has a get-by-id endpoint; otherwise a row-expand or modal is fine.
2. **Create page or modal** for POST endpoints: form using `Field` + `inputCls`, submit → success panel showing the returned id, buttons to go to the list or create another.
3. **Edit/action UIs** for PUT/PATCH/DELETE: inline on the detail page or via `Modal`. DELETE always confirms first via `Modal` ("ยืนยันการลบ...").
4. Action endpoints (approve, cancel, reverse, arrival, finish, prepare, use, deduct, restock, ...) → buttons on the relevant row/detail with a confirm modal where destructive.

## UI kit (import from `@/components/ui`)

`PageHeader, Card, Badge, statusTone, Field, ErrorBox, SuccessBox, LoadingBox, EmptyBox, TableShell, Th, Td, Modal, inputCls, selectCls, btnPrimaryCls, btnSecondaryCls, btnDangerCls, formatDate, formatDateTime, formatGender, formatMoney`

- Wrap every page in `<AppShell>` (`@/components/AppShell`) and start with `<PageHeader title="..." />`.
- All pages are client components (`"use client"`).
- All UI text in **Thai** (technical identifiers like HN, VN, DF, Order ID stay as-is). Dates via `formatDate`/`formatDateTime`, money via `formatMoney`, gender via `formatGender`, statuses via `<Badge tone={statusTone(s)}>`.
- Style: white cards on slate-50 background, teal accent, rounded-lg. Match the existing `app/patients` pages.

## Fetch-on-mount pattern (lint-clean)

```tsx
const load = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const res = await listThings(filters);
    setRows(res.data);
    setTotal(res.total_found);
  } catch (err) {
    setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
  } finally {
    setLoading(false);
  }
}, [filters]);

useEffect(() => {
  void load();
}, [load]);
```

If the ESLint fetch-on-mount rule still complains, add a targeted `// eslint-disable-next-line` like the existing pages do.

## Verification

Do **not** run `npm run build`, `npm run lint`, or `tsc` — other agents are editing sibling modules concurrently and the whole-project check will fail on their in-progress files. Write careful, type-correct code; the orchestrator builds at the end.
