# Interview demonstration notes

## Explain the system in one minute

“I built a small shopping application with a Java Spring Boot REST API, a React/TypeScript storefront, and PostgreSQL. I use H2 for easy local startup. My Playwright tests cover customer journeys and API contracts. Fixtures create independent test accounts, page objects hide repeated UI actions, and CI verifies the application against PostgreSQL. Checkout uses a database transaction and calculates prices on the server.”

Only claim the parts you have personally run and understand. Review the validation report before discussing results.

## Questions to prepare

### Why UI and API tests?

UI tests verify the integration a customer uses, including form behavior, navigation and rendering. API tests cover validation, authorization and concurrency faster and with more precise setup. The main checkout test cross-checks UI confirmation with the saved API order. Java tests add a closer integration layer around controllers and database behavior.

### Why Page Object Model?

Selectors and common interactions live in one place, so screen changes do not require edits throughout the suite. Each page object models a real screen; tests still show the workflow and expected business result. A page object should not become a generic framework that hides what a test does.

### How do tests avoid flaky timing?

Use role/label locators, Playwright action auto-waiting and retrying assertions. Wait for a meaningful state such as an updated cart total. Avoid fixed sleeps, generated CSS selectors and shared mutable test data. Review traces before increasing a timeout. A passing retry still deserves investigation.

### How is parallel execution safe?

Each test creates a unique UUID email, account and cart. Playwright supplies an isolated browser context. Seeds are read-only. There is no shared account or shared storage-state file. Fixture teardown revokes the session, while records remain for diagnosis in a disposable test database.

### Why an opaque token instead of JWT?

The server stores a hash of a random token. This is simple to revoke on logout and easy to inspect in a small application. It costs a database lookup on each request. JWTs have other tradeoffs, including revocation and key management. The token is not a password and is not stored in clear text in the database.

### How do you prevent another customer reading an order?

The API resolves the authenticated customer and constrains the order query by both order ID and customer ID. A request by another account returns 404. A UUID alone is not authorization. The API test creates a second customer to check this explicitly.

### Why use BigDecimal?

Binary floating point can introduce rounding errors. The backend uses BigDecimal and SQL NUMERIC for money. The browser formats the returned number for display. The server calculates the authoritative total. This demo has no tax or discounts; those would require explicit rounding policies.

### What happens if checkout fails?

The service validates the cart and mock payment before inserting the order. Order creation, line snapshots and cart clearing run in one transaction. A database failure rolls back those operations. A declined payment keeps the cart. Real payment authorization would need idempotency, provider callbacks and a design for coordinating external effects with database transactions.

### What happens with two checkout requests?

Both lock the customer's row. The first creates an order and clears the cart; the second then sees an empty cart and returns 400. The parallel API test checks for exactly one 201 response and one saved order. This is a small-app transaction strategy; a larger system might use cart versions and idempotency keys.

### Are “Add to cart” requests atomic increments?

No. The API intentionally provides an idempotent PUT to set an absolute quantity. The UI reads the current cart and sets one more. Concurrent adds from separate tabs can overwrite each other's intended increment. A future add endpoint with an atomic database increment would address that. The transaction lock protects writes and checkout, not this client-side read/compute interval.

### Why both H2 and PostgreSQL?

H2 makes the first run easy. PostgreSQL is used by Compose and the CI end-to-end job. H2 compatibility mode does not guarantee identical locking, SQL or performance behavior, which is why testing the actual PostgreSQL path matters.

### How would you extend it?

Add pagination, inventory reservation and stock-conflict tests; secure account recovery; a reviewed cookie/CSRF or token design; payment-provider sandbox integration with idempotency keys; accessibility checks; contract/schema tests; observability; and migration rollback/recovery procedures. Add each alongside an explicit test strategy rather than increasing framework complexity first.

## Useful live demonstrations

1. Inspect a failed trace by deliberately changing one expected total locally, then restore the expectation.
2. Run API tests with four workers and explain why results do not depend on order.
3. Compare a validation error (400) with missing credentials (401).
4. Show that declined payment preserves the cart.
5. Show the parallel-checkout test and the transaction/row lock that makes it pass.
6. Explain what CI has actually tested, and what still needs production work.
