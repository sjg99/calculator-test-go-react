# Sezzle take-home: full-stack calculator

This repo is a take-home technical assessment for Sezzle (Senior Software Engineer, LATAM).
Sezzle allows any AI tooling, but asks candidates to share the prompts they used, so this
session's conversation will be exported and submitted. Keep the work focused on the assignment.

## Assignment (as given by Sezzle)

**Objective:** Build a full-stack calculator application with a React frontend and a backend
microservice. The frontend consumes the backend API to perform basic and advanced arithmetic.
Focus on clean design, maintainable code and testable architecture.

**Functional**
- Operations: addition, subtraction, multiplication, division.
- Optional: exponentiation, square root, percentage.
- Frontend (React): intuitive UI for entering input and displaying results; input validation
  and error handling; responsive design (basic mobile support).
- Backend (REST API): endpoints for calculator operations; validate input and handle edge cases
  (division by zero, invalid data); return results as JSON.

**Non-functional**
- Clean, readable, idiomatic code in both frontend and backend.
- Unit tests covering key functionality in both layers.
- Documentation: setup instructions, API usage and design rationale.
- Optional: Dockerfile for full-stack deployment.

**Constraints**
- Frontend: React, TypeScript preferred.
- Backend: Go preferred.

**Deliverables**
1. Git repository with frontend and backend code.
2. README with setup instructions, how to run frontend and backend, API call examples, and
   design decisions or assumptions.
3. Unit tests and a coverage report.
4. Optional: Dockerfile to run frontend and backend together.

**Time box:** about 2 to 4 hours. Prioritize correctness, clarity and maintainability over
extra features.

**Submission:** push to a Git host (GitHub), share the repo link on Sezzle's Greenhouse test
page, and share the prompts used. Due within 5 business days of Nov 23, 2026 (by Mon Nov 30).

## Local environment (Windows 11)

- Go 1.27.4 (`C:\Program Files\Go`), GOPATH `C:\Users\santi\go`.
- Node 22.20.0, npm 10.9.3.
- Git 2.51, configured with a GitHub noreply email.
- Docker 28.4 via Docker Desktop. Start Docker Desktop before using `docker` commands.
- No C compiler and `CGO_ENABLED=0`, so `go test -race` is unavailable. Use `go test -cover`.
- Shells available: PowerShell and Git Bash.
- GitHub CLI (`gh`) is not installed. Create the remote repo on github.com, or install `gh`.

## Working agreements

- Decide the architecture together with the candidate in this session. Explain trade-offs
  briefly, since design decisions go into the README.
- Write tests alongside the code. Produce a coverage report for both layers (for example
  `go test -coverprofile` for Go and the frontend test runner's coverage output).
- Make small, meaningful commits.
- Never commit secrets, `.env` files or personal data.
