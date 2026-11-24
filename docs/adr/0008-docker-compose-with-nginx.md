# 0008. Docker Compose with nginx in front of the API

- Status: accepted
- Date: 2026-11-24

## Context

The assignment asks for an optional way to run frontend and backend together. Options were one
image (Go serving the embedded React build) or two images orchestrated by Compose.

## Decision

- `backend/Dockerfile`: multi-stage build, static Go binary on `gcr.io/distroless/static:nonroot`.
- `frontend/Dockerfile`: multi-stage build, static files on `nginxinc/nginx-unprivileged`
  (non-root, port 8080). nginx serves the app with an SPA fallback, long-lived caching for
  hashed assets, basic security headers, and proxies `/api/` to the `api` service.
- `docker-compose.yml` at the repository root starts both; the app is on `http://localhost:3000`.

## Consequences

- Frontend and backend stay independently deployable, as in a microservice setup.
- The browser sees one origin, so CORS is not needed in this setup.
- Runtime images are small (about 17 MB for the API) and run as non-root. The distroless
  image has no shell or curl, so the binary has a `healthcheck` subcommand that calls
  `/healthz`; Compose starts nginx only once the API reports healthy.
- Two images to build instead of one, which Compose hides behind a single command.
