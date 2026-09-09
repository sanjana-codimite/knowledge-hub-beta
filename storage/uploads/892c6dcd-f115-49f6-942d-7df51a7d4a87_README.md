# Knowledge Hub — Task 1: Google SSO (Backend)

Backend-only guide for the Google SSO login task. Postgres and Redis run in
Docker via `docker-compose.yml`.

## 0. What this implements (mapped to acceptance criteria)

| Acceptance criteria | Where |
|---|---|
| Only codimite.com users can log in | `internal/authz/service.go` → `isAllowedDomain` (checked against the **cryptographically verified** ID token, not the client-controlled `hd` URL param) |
| Every route carries the auth context | `authSvc.WithAuthContext` middleware mounted on the whole `/web` router in `cmd/khub/main.go` |
| Any codimite.com user is a regular user | `internal/users/repository.go` → `UpsertFromGoogle` always inserts `role = 'user'` |
| Opaque access tokens | `internal/authz/token.go` → `generateOpaqueToken`, stored in Redis by `service.go` → `issueTokenPair` |
| JWT refresh tokens | `internal/authz/token.go` → `generateRefreshToken` (HS256) |
| Redis for the opaque token | `internal/pkg/store/redis.go` + `sessionKey()` in `service.go` |
| `/web/*` → API, `/` → React | `cmd/khub/main.go` router setup |
| Go embedded frontend | `web/embedded.go` |
| Dependency injection | Constructor injection throughout — see `cmd/khub/main.go`, no globals, no framework |

## 1. Prerequisites

- Go 1.22+
- Docker + Docker Compose
- A Google Cloud OAuth 2.0 Client ID (you said you already have this)

## 2. Configure the Google OAuth client

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), open your OAuth 2.0 Client ID and make sure:

- **Application type**: Web application
- **Authorized redirect URIs** includes exactly:
  ```
  http://localhost:8080/web/auth/google/callback
  ```
  (add your production URL later, e.g. `https://khub.codimite.com/web/auth/google/callback`)
- Under **OAuth consent screen**, if your Workspace lets you restrict it, set **User type** to Internal (this restricts login at Google's side too — but our backend enforces the `codimite.com` check regardless, so it's safe even as External/Testing).

## 3. Start Postgres + Redis with Docker

```bash
cd app
docker compose up -d
docker compose ps   # both should be healthy
```

This starts:
- Postgres on `localhost:5432` (db `khub`, user/pass `khub`/`khub`)
- Redis on `localhost:6379`, no auth

These match the defaults already in `.env.example`, so no changes needed for local dev.

## 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
```
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
JWT_SECRET=<run: openssl rand -base64 48>
```
Leave `POSTGRES_DSN` and `REDIS_ADDR` as-is — they already point at the
Docker containers from step 3.

## 5. Install Go dependencies

```bash
go mod tidy
```
This downloads chi, pgx, go-redis, golang-jwt, go-oidc, oauth2, godotenv and generates `go.sum`.

## 6. Run the DB migration

With Postgres running in Docker:
```bash
docker compose exec -T postgres psql -U khub -d khub < migrations/0001_init.up.sql
```
(or `make migrate-up` if you have the `psql` client installed locally and `.env` exported)

This creates the `users` table (`google_sub`, `email`, `name`, `picture_url`,
`role` default `'user'`, timestamps).

## 7. Run the backend

```bash
go run ./cmd/khub
```
You should see:
```
connected to postgres
connected to redis
khub listening on :8080
```

`web/dist/` currently only has a placeholder `index.html` so the binary
compiles without the real frontend. Once you build the Vite app:
```bash
cd frontend && npm run build && cp -r dist/* ../app/web/dist/
```
then re-run `go run ./cmd/khub` (or rebuild) to serve the real SPA at `/`.

## 8. Try the flow

1. Open `http://localhost:8080/web/auth/google/login` in a browser (not curl —
   it's a redirect to Google's consent screen).
2. Log in with a `@codimite.com` account → redirected back, `khub_access_token`
   and `khub_refresh_token` httpOnly cookies are set → redirected to `/`.
3. Confirm the session:
   ```bash
   curl -b "khub_access_token=<value from browser devtools>" http://localhost:8080/web/auth/me
   ```
4. Try logging in with a non-codimite.com Google account → redirected to
   `/login?error=domain_not_allowed`, no cookies set, no row written to `users`.
5. Refresh the access token:
   ```bash
   curl -X POST -b "khub_refresh_token=<value>" http://localhost:8080/web/auth/refresh
   ```
6. Log out:
   ```bash
   curl -X POST -b "khub_access_token=<v>;khub_refresh_token=<v>" http://localhost:8080/web/auth/logout
   ```
   Afterwards, `/web/auth/me` with the old access token returns 401, and
   `/web/auth/refresh` with the old refresh token returns 401 (it's on the
   Redis revocation denylist even though the JWT hasn't expired yet).

## 9. How the pieces fit together

**Login (`GET /web/auth/google/login`)**
Generates a random CSRF `state`, stores it in a short-lived cookie, redirects to Google.

**Callback (`GET /web/auth/google/callback`)**
1. Checks `state` matches the cookie (CSRF protection).
2. Exchanges the `code` for Google tokens.
3. Verifies the ID token's signature/issuer/audience/expiry against Google's
   JWKS via OIDC discovery (`internal/authz/google.go`) — this is what makes
   the domain check trustworthy; nothing from the token is used before it's
   verified.
4. Checks `hd` (or email suffix) == `codimite.com`. Rejects otherwise.
5. Upserts the user in Postgres with `role = 'user'`.
6. Issues an opaque access token → stored in Redis as
   `session:<token> = {user_id, email, role}` with a 15 min TTL.
7. Issues a JWT refresh token (7 day TTL, signed HS256) with a unique `jti`.
8. Sets both as httpOnly cookies, redirects into the SPA.

**Every `/web/*` request**
`authSvc.WithAuthContext` middleware reads the access-token cookie, looks it
up in Redis, and attaches an `AuthContext{Authenticated, UserID, Email,
Role}` to the request context — whether or not the lookup succeeds. Handlers
read it via `types.FromContext(r.Context())`. Routes that must be logged-in
also run `authSvc.RequireAuth`, which 401s if `Authenticated` is false.

**Refresh (`POST /web/auth/refresh`)**
Validates the refresh JWT, checks its `jti` isn't on the Redis
revocation denylist, re-loads the user, and issues a brand new
access+refresh pair (rotation).

**Logout (`POST /web/auth/logout`)**
Deletes the access token's Redis key immediately, and adds the refresh
token's `jti` to a Redis denylist (`revoked_refresh:<jti>`) TTL'd to its
remaining lifetime.

## 10. Adding a new protected `/web/*` route

```go
// in cmd/khub/main.go, inside the r.Group(func(r chi.Router){ r.Use(authSvc.RequireAuth) ... })
r.Mount("/articles", articlesHandler.Routes())

// anywhere inside that handler:
ac := types.FromContext(r.Context())
// ac.UserID / ac.Email / ac.Role are guaranteed populated here
```

## 11. Notes for production / going hosted later

- Set `COOKIE_SECURE=true` and serve over HTTPS — browsers silently drop
  `Secure` cookies over plain HTTP.
- If the frontend and backend end up on different origins, you'll need
  CORS configuration and likely `SameSite=None; Secure` on the cookies.
- If you move Postgres/Redis to a managed/hosted provider instead of
  Docker, just change `POSTGRES_DSN` (add `?sslmode=require`) and
  `REDIS_ADDR`/`REDIS_PASSWORD` in `.env` — no code changes needed, since
  those are the only two places connection details are read
  (`internal/pkg/store/*.go`).
- Rotate `JWT_SECRET` via a secrets manager in real deployments, not `.env`.
