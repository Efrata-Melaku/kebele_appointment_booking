# Kebele Frontend

Two separate React applications share the same backend API and the `@kebele/shared` package.

| Application | Port | Description |
|-------------|------|-------------|
| **resident-portal** | 5173 | Public resident services (book, track, edit, cancel, feedback, services) |
| **management-portal** | 5174 | Admin & staff (dashboards, services, staff, reports, form builder, settings) |

## Setup

From the `frontend` directory:

```bash
npm install
```

Copy environment examples if needed:

- `resident-portal/.env.example` → `resident-portal/.env`
- `management-portal/.env.example` → `management-portal/.env`

Ensure the backend is running (default `http://localhost:5000`).

## Development

Run one portal:

```bash
npm run dev:resident      # http://localhost:5173
npm run dev:management    # http://localhost:5174
```

Run both at once:

```bash
npm run dev:all
```

## Production build

```bash
npm run build
```

Build outputs:

- `resident-portal/dist`
- `management-portal/dist`

## Shared code

`shared/src` contains API clients, auth helpers, UI primitives, and Kebele feature modules used by both apps. App-specific routes live in each portal’s `src/lib/routes.ts`.
