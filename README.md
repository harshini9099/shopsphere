# ShopSphere

A complete small shopping application and SDET portfolio: **Java 17 + Spring Boot**, **React + TypeScript**, **PostgreSQL / H2**, and **Playwright + TypeScript**.

Browse eight seeded products, search/filter/sort, register, log in, manage your cart, simulate checkout, and view saved orders. No payment account, API key, or product-image service is needed. Emoji illustrations are built in; the optional Google font falls back to system fonts offline.

## 1. Choose your setup

| Option | Prerequisites | Database | Best for |
|---|---|---|---|
| Local (simplest) | JDK 17, Maven 3.9+, Node 22.12+ and npm | H2, created automatically | First run and coding |
| All Docker | Docker Desktop with Compose v2 | PostgreSQL 17 | Reproducible full application |
| Mixed | Local prerequisites + Docker | PostgreSQL 17 in Docker | Developing against PostgreSQL |

You need internet access for the first dependency downloads. Use a recent Node 22 LTS release. VS Code is recommended, but optional. This ZIP contains source and lockfiles, not downloaded dependencies or a Java runtime. Read `docs/VALIDATION.md` for the actual validation results.

### Install prerequisites on macOS

If Homebrew is installed:

```bash
brew install --cask temurin@17
brew install maven node@22
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="$(brew --prefix node@22)/bin:$PATH"
java -version
mvn -version
node --version
npm --version
```

Otherwise install the JDK 17 macOS package from [Eclipse Temurin](https://adoptium.net/temurin/releases/?version=17), the Node 22 LTS installer from [Node.js](https://nodejs.org/en/download), and the binary Maven archive from [Apache Maven](https://maven.apache.org/download.cgi). Add Maven's `bin` directory to your shell PATH. Restart Terminal after installation. On Apple Silicon, choose ARM64/aarch64 installers; on Intel, choose x64.

For Docker mode, install and launch [Docker Desktop](https://www.docker.com/products/docker-desktop/), then verify `docker compose version`.

### Install prerequisites on Windows

Use PowerShell. Install JDK and Node through the official installers above or Windows Package Manager:

```powershell
winget install --id EclipseAdoptium.Temurin.17.JDK --exact
winget install --id OpenJS.NodeJS.LTS --exact
```

The LTS package may install a newer Node LTS; Node 22.12+ is required. For an exact Node 22 setup, select version 22 in the official Node download page. Download Maven's **binary ZIP** from Apache Maven, extract it (for example `C:\Tools\apache-maven-3.9.11`), and add `C:\Tools\apache-maven-3.9.11\bin` to your user PATH through “Edit environment variables for your account.” Set `JAVA_HOME` to your JDK directory if the installer has not done so. Open a new PowerShell window and verify:

```powershell
java -version
mvn -version
node --version
npm.cmd --version
```

If PowerShell blocks `npm.ps1` or `npx.ps1`, use **`npm.cmd` and `npx.cmd`** in place of `npm` and `npx` in this guide. You do not need to change your execution policy. For Docker, install Docker Desktop, enable its WSL 2 backend if prompted, launch it, then run `docker compose version`.

## 2. Local quick start (H2, no database installation)

Extract the ZIP first. Open the **shopsphere** folder containing `package.json` in VS Code. Run all root commands from that folder. Paths below are examples; substitute the location where you extracted it.

### macOS — Terminal 1: backend

```bash
cd ~/Downloads/shopsphere
mvn -f backend/pom.xml clean verify
cd backend
mvn spring-boot:run
```

Wait for `Started ShopSphereApplication`. H2 stores data in `backend/data/shopsphere.mv.db` because the backend is started from `backend/`. Flyway creates the schema and inserts eight products on the first run. There is no default user; register through the app.

### macOS — Terminal 2: frontend

```bash
cd ~/Downloads/shopsphere
npm ci
cp .env.example .env
npm run dev
```

### Windows — PowerShell 1: backend

```powershell
cd "$HOME\Downloads\shopsphere"
mvn -f backend/pom.xml clean verify
cd backend
mvn spring-boot:run
```

### Windows — PowerShell 2: frontend

```powershell
cd "$HOME\Downloads\shopsphere"
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Open **http://localhost:5173**. Check **http://localhost:8080/api/health** for `{"status":"UP"}`. Register a new account, select a product, and add it to your cart.

**Startup order:** database → backend → frontend → tests. With H2 the database starts inside the backend, so begin with the backend. Keep the two application terminals open. Stop each with Ctrl+C when finished. Accounts, carts, orders, and login sessions persist in the H2 file; sessions expire after 24 hours.

## 3. Docker quick start (PostgreSQL)

Only Docker Desktop is needed to run the application. Node is additionally needed if you run Playwright from your host.

From the project root, on either OS:

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Wait for the backend to start, then open **http://localhost:5173**. Compose waits for PostgreSQL and backend health checks before starting dependent services. The frontend image builds the React app and serves it with Nginx; Nginx proxies `/api` to the backend. Ports are bound to your own machine.

```bash
# Stop containers, keep saved PostgreSQL data
docker compose down
# View logs
docker compose logs backend db frontend
```

To reset this project's database deliberately, run `docker compose down -v`; **this deletes this project's saved accounts, carts, and orders**. The next startup recreates the eight products. A normal `docker compose down` does not delete them.

The Compose password is a local demo value. You may add `POSTGRES_PASSWORD=your-local-password` to the root `.env` before first startup. Changing it after the database volume exists does not change the already-created PostgreSQL role.

### Run Playwright against Docker

After all services are running:

```bash
npm ci
npx playwright install chromium
```

macOS:

```bash
PW_SKIP_WEBSERVER=1 npx playwright test --project=api --project=chromium
```

Windows PowerShell:

```powershell
$env:PW_SKIP_WEBSERVER="1"
npx.cmd playwright test --project=api --project=chromium
Remove-Item Env:PW_SKIP_WEBSERVER
```

Both modes use port 5173. Stop a local Vite server before starting the Docker frontend.

## 4. Mixed mode: local code + PostgreSQL

Start only the database:

```bash
docker compose up -d db
```

macOS, in the backend terminal:

```bash
cd backend
export DB_URL=jdbc:postgresql://localhost:5432/shopsphere
export DB_USER=shopsphere
export DB_PASSWORD=local-demo-password
mvn spring-boot:run
```

Windows PowerShell:

```powershell
cd backend
$env:DB_URL="jdbc:postgresql://localhost:5432/shopsphere"
$env:DB_USER="shopsphere"
$env:DB_PASSWORD="local-demo-password"
mvn spring-boot:run
```

Use your custom password if set. Start the frontend normally from another root terminal with `npm run dev`. These environment variables are read by Spring Boot; the root `.env` is read by Playwright and Compose, **not automatically by Spring Boot**. Unset the three `DB_` variables or open a fresh terminal to switch back to H2.

## 5. Automated tests

Keep the backend running. From the root, install the browser once:

```bash
npm ci
npx playwright install chromium
npm run build
npm run typecheck
npx playwright test --project=api --project=chromium
```

On Windows use `npm.cmd`/`npx.cmd` when needed. Playwright starts Vite automatically if port 5173 is unused; it reuses your existing Vite server locally. API-only tests still start Vite by default; set `PW_SKIP_WEBSERVER=1` to skip it. API tests use `API_URL` directly and do not need a browser installation.

| Command | Purpose |
|---|---|
| `npm run test:api` | REST API coverage |
| `npm run test:ui` | Chromium UI coverage |
| `npm run test:headed` | Watch Chromium interact with the app |
| `npm run test:debug` | Step through tests in Playwright Inspector |
| `npx playwright test --ui --project=chromium` | Interactive Playwright UI runner |
| `npx playwright test --project=chromium --grep "declined"` | Run one behavior |
| `npx playwright test --project=api --workers=4` | Demonstrate parallel API execution |
| `npx playwright test --project=chromium --retries=2` | Retry failed tests locally |
| `npx playwright install` then `npm test` | All API and three browser projects |
| `npm run test:all-browsers` | UI tests in Chromium, Firefox, WebKit; install all browsers first |
| `npm run report` | Open the HTML report |
| `npx playwright show-trace path/to/trace.zip` | Inspect a retained failure trace |
| `mvn -f backend/pom.xml verify` | Java integration tests and executable JAR |

### Framework design

- **Page objects** in `tests/pages/` encapsulate UI interactions. Assertions about business outcomes remain in tests.
- **Fixtures** in `tests/fixtures/` create one unique account per test. Each test gets a separate browser context and isolated server-side cart. API setup keeps UI tests focused.
- **Test data** in `tests/data/` uses UUID email addresses and a shared fictional shipping address.
- **Utilities** in `tests/utils/` centralize API URLs, bearer headers, and cart setup.
- **Parallelism:** tests are independent and `fullyParallel` is enabled. CI uses two workers; local runs use Playwright's default worker count. No fixed sleeps or shared saved login files.
- **Retries:** zero locally; two on CI. A retry is evidence of a possible flaky test, not proof that the original failure is harmless.
- **Evidence:** screenshots only on failure; videos and traces retained on failure (including the first failed attempt). API tests produce traces but have no browser screenshots or videos.
- **Reports:** HTML at `playwright-report/index.html`; JUnit XML at `test-results/junit.xml`; detailed evidence under `test-results/`.
- **Cleanup:** fixture sessions are revoked after each test. Test accounts/orders remain for investigation; use a disposable database and periodically reset it. There is intentionally no public test-only “delete all data” API.
- **Authentication tests** use Playwright's base fixture so they exercise registration/login through the UI rather than preloading an authenticated session.

### Coverage

UI: registration/login/logout, invalid credentials, guest cart, search/filter/sort, product details, cart quantity/removal, successful checkout, declined payment recovery, order confirmation/history, and cross-checking the order through the API.

API: catalog/filter/sort, not-found products, duplicate registration, input validation, authentication and revocation, quantity bounds, decimal totals, declined payment rollback, shipping validation, ownership isolation, empty checkout, and simultaneous checkout requests.

Java integration tests exercise real controllers, validation, services, Flyway migrations, and JDBC against in-memory H2 using MockMvc. They check server-priced checkout, payment failure retaining the cart, order ownership, cart validation, and session revocation.

## 6. Environment configuration

Copy `.env.example` to `.env`; do not commit personal settings.

| Variable | Default | Used by |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | Playwright UI tests |
| `API_URL` | `http://localhost:8080` | Playwright API calls/fixtures |
| `PW_SKIP_WEBSERVER` | `0` | Set `1` for an existing/remote frontend |
| `DB_URL` | H2 file URL | Backend |
| `DB_USER` | `sa` | Backend |
| `DB_PASSWORD` | empty for H2 | Backend |
| `POSTGRES_PASSWORD` | `local-demo-password` | Compose database/backend |
| `API_PROXY_TARGET` | `http://localhost:8080` | Vite proxy; export before `npm run dev` |

For a remote environment, set both test URLs and `PW_SKIP_WEBSERVER=1`. Run only against an environment you control. The tests create accounts and orders. The frontend uses relative `/api` URLs, so the same build works behind Vite or Nginx without embedding backend URLs.

## 7. Architecture and code map

```text
Browser → React / TypeScript → same-origin /api proxy
                                  ↓
                           Spring REST controllers
                                  ↓
                   AuthService / ShopService transactions
                                  ↓
                        JDBC + Flyway migrations
                                  ↓
                         H2 or PostgreSQL

Playwright → browser UI and direct REST API assertions
GitHub Actions → builds, H2 integration tests, PostgreSQL + Playwright
```

```text
shopsphere/
  backend/
    pom.xml                         Java dependencies and build
    src/main/java/com/shopsphere/
      ApiController.java            REST routes and request validation
      Models.java                   Request/response records
      AuthService.java              BCrypt passwords and opaque sessions
      ShopService.java              Catalog, cart and transactional checkout
      ApiErrors.java                Consistent validation/business errors
    src/main/resources/
      application.properties        Environment-driven database configuration
      db/migration/                 Versioned schema and product seeds
    src/test/                       MockMvc integration tests
  frontend/src/
    main.tsx                        Small, readable React screens and routing
    api.ts                          Typed fetch helper and money formatting
    types.ts                        Frontend contracts
    styles.css                      Responsive storefront styles
  tests/{pages,fixtures,data,utils,ui,api}/
  playwright.config.ts
  .github/workflows/ci.yml
  .vscode/extensions.json
  compose.yaml
  docs/{API,INTERVIEW,VALIDATION}.md
```

**Data and correctness:** PostgreSQL is the full-stack/CI database; H2's PostgreSQL mode is a convenient local fallback. Flyway runs the same migration scripts for both. Prices use `BigDecimal`/`NUMERIC(12,2)` on the server. Checkout reads current catalog prices, creates immutable order-line price/name snapshots, and clears the cart inside one transaction. A customer-row lock serializes cart writes and checkout for that account; simultaneous checkout requests cannot create two orders from the same cart. Quantity PUT replaces the quantity rather than incrementing it. The UI reads the cart and sends the next quantity when “Add to cart” is clicked.

**Authentication:** passwords are hashed with BCrypt; random opaque 256-bit bearer tokens expire after 24 hours and only their SHA-256 hashes are stored in the database. Logout revokes the server session. Tokens live in browser `sessionStorage` and survive a reload in the same tab. Every protected route resolves the token; order reads additionally constrain by account. No cookie-based authentication or credentialed cross-origin requests are used.

**Demo boundaries:** USD only, free shipping, zero tax, no inventory limits, no real payment gateway, no admin interface, no password reset/email verification, and no production rate limiter. Client storage can be read by injected JavaScript; a production deployment would need a reviewed authentication design, HTTPS, CSP, rate limits, secret management, and payment-provider integration. Retries of a checkout after a lost response are not idempotency-key based; the empty cart prevents a duplicate order, and order history lets the user check what happened. See interview notes for extension ideas.

## 8. VS Code extensions

Open the extracted project root in VS Code, go to Extensions, and search `@recommended`. The included `.vscode/extensions.json` recommends:

| Extension ID | What it provides here |
|---|---|
| `vscjava.vscode-java-pack` | Java language support, debugger, Maven explorer, and Java test runner |
| `vmware.vscode-boot-dev-pack` | Spring Boot project navigation and application dashboard |
| `ms-playwright.playwright` | Test discovery, run/debug actions, locator picking and browser support |
| `esbenp.prettier-vscode` | Optional consistent formatting for TypeScript, CSS, JSON and Markdown |
| `ms-azuretools.vscode-docker` | Docker/Compose file support, container and image management |
| `mtxr.sqltools` | Optional SQL connection explorer and query editor |
| `mtxr.sqltools-driver-pg` | PostgreSQL driver for SQLTools; connect to localhost:5432, database/user `shopsphere` |

Extensions help the editor; they do not install Java, Maven, Node, Docker, or Playwright browsers. TypeScript support itself is built into VS Code. The project does not include ESLint rules, so an ESLint extension is not required. The SQLTools connection password is your local Compose password; do not save personal credentials in source files.

## 9. GitHub Actions

Push the extracted project to a GitHub repository with `.github/` included. On pushes and pull requests, CI installs Node/Java, runs a clean npm installation, typechecks, builds the frontend, runs Java/H2 integration tests, starts the packaged backend against a PostgreSQL service, and runs API + Chromium tests. Playwright manages Vite. Reports and logs are uploaded even on failure for 14 days. Download the `shopsphere-test-evidence` artifact from the workflow run.

CI does not deploy or charge a payment provider. Firefox and WebKit are available locally; the default workflow uses Chromium to keep its run time small. Add browser installation and projects to the workflow to expand coverage.

## 10. Troubleshooting

| Symptom | Check / solution |
|---|---|
| `java`/`mvn` not found | Install prerequisites, reopen terminal, check `JAVA_HOME` and Maven `bin` in PATH. `mvn -version` must show Java 17 or newer. |
| Vite reports unsupported Node | Install Node 22.12+; verify the terminal is using it with `node --version`. |
| PowerShell script blocked | Use `npm.cmd` and `npx.cmd`; no policy change needed. |
| Port 5173 already in use | Stop the other frontend; Vite intentionally fails rather than silently changing the test URL. |
| Port 8080 or 5432 in use | Stop the conflicting local service or Compose stack. If changing ports, update proxy/test/database URLs consistently. |
| UI shows network/proxy errors | Confirm `/api/health` on 8080 works and the backend terminal is still running. |
| H2 “database already in use” | Run only one backend against the H2 file. Stop the other process first. |
| Missing products after editing migrations | Flyway executes versioned files once. Add a new migration; do not change an applied migration. For a disposable demo, stop the backend and reset its database. |
| Want a clean H2 database | Stop the backend, back up if needed, then delete only `backend/data/shopsphere.mv.db` and optional matching trace file. This removes saved accounts/orders. Restart from `backend/`. |
| PostgreSQL password failure | Match `DB_PASSWORD` with the password used to initialize the volume. Changing `.env` does not reset an existing database password. |
| Browser executable missing | Run `npx playwright install chromium` (or `npx playwright install` for all projects). |
| Tests time out | Check backend health and the configured URLs, then inspect the HTML report, trace and screenshot. Do not add arbitrary sleeps. |
| Browser cannot reach app but API works | Check `BASE_URL`; use `PW_SKIP_WEBSERVER=1` for Docker. Ensure the Docker frontend is healthy. |
| Duplicate email | Register a different email or log in. Automated tests generate unique emails. |
| Session expired | Log in again. Browser sessions are tab-scoped and server tokens expire after 24 hours. |
| Docker build fails at downloads | Check internet/proxy/Docker Desktop. Run `docker compose build --progress=plain` for details. |
| npm installation trouble | Use `npm ci` from the root, not from frontend. Keep the supplied lockfile. If behind a proxy, configure your organization's trusted npm registry settings. |

## 11. Five-minute demonstration

1. Register and explain why test accounts use UUID emails.
2. Filter Electronics, open Everyday Headphones, add it, and set quantity to 2.
3. Explain `$159.98`: server-side decimal math, not a client-supplied total.
4. Choose declined mock payment; show the cart survives. Approve it and inspect confirmation/history.
5. Run `npm run test:api`, then `npm run test:headed` and `npm run report`.
6. Open the fixture, one page object, and the concurrent-checkout API test. Explain isolation, auto-waiting and database transactions.

Read `docs/INTERVIEW.md` for deeper questions and `docs/API.md` for request examples.

## References

- [Spring Boot 3.5 requirements](https://docs.spring.io/spring-boot/3.5/system-requirements.html)
- [Playwright test configuration](https://playwright.dev/docs/test-configuration)
- [Playwright evidence and use options](https://playwright.dev/docs/test-use-options)
- [Playwright web server management](https://playwright.dev/docs/test-webserver)

MIT licensed; see `LICENSE`.
