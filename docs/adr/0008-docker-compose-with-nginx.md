# 0008. Docker Compose with nginx in front of the API

- Status: accepted
- Date: 2026-11-24

## Context

The assignment asks for an optional way to run frontend and backend together. Options were one
image (Go serving the embedded React build) or two images orchestrated by Compose.

## Decision

- `backend/Dockerfile`: multi-stage build, static Go binary on `gcr.io/distroless/static:nonroot`.
- `frontend/Dockerfile`: multi-stage build, static files on `nginx:alpine`. nginx serves the app
  with an SPA fallback and proxies `/api/` to the `api` service.
- `docker-compose.yml` at the repository root starts both; the app is on `http://localhost:3000`.

## Consequences

- Frontend and backend stay independently deployable, as in a microservice setup.
- The browser sees one origin, so CORS is not needed in this setup.
- Runtime images are small and run as non-root. The distroless image has no shell, so the
  image has no built-in health check and Compose only relies on the process staying up.
- Two images to build instead of one, which Compose hides behind a single command.
