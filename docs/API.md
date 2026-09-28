# REST API guide

Local base URL: `http://localhost:8080/api`. All request/response bodies use JSON. Send `Content-Type: application/json`. Protected routes require `Authorization: Bearer <token>`.

| Method and path | Authentication | Result |
|---|---|---|
| GET `/health` | Public | 200 health status |
| POST `/auth/register` | Public | 201 token and public user |
| POST `/auth/login` | Public | 200 token and public user |
| GET `/auth/me` | Required | 200 public user |
| POST `/auth/logout` | Required | 204; revokes current token |
| GET `/products` | Public | 200 product array |
| GET `/products/{id}` | Public | 200 product; 404 if absent |
| GET `/cart` | Required | 200 items and server total |
| PUT `/cart/items/{productId}` | Required | 200 cart; sets absolute quantity |
| DELETE `/cart/items/{productId}` | Required | 200 cart; safe if item already absent |
| POST `/orders` | Required | 201 confirmed order; 402 on simulated decline |
| GET `/orders` | Required | 200 own orders, newest first |
| GET `/orders/{id}` | Required | 200 own order; 404 for absent/another user's order |

Products accept `search`, `category`, and `sort`. Sort is `name`, `price-asc`, or `price-desc`; unknown values return 400. Search is case-insensitive SQL LIKE matching on product names, so `%` and `_` have SQL wildcard behavior. Category is an exact match. Catalog and order lists are intentionally small and not paginated.

## Example bodies

Register:

```json
{"name":"Harshini","email":"harshini@example.test","password":"DemoPass!234"}
```

Login:

```json
{"email":"harshini@example.test","password":"DemoPass!234"}
```

Success:

```json
{"token":"opaque-random-token","user":{"id":1,"name":"Harshini","email":"harshini@example.test"}}
```

Set cart item quantity (1–99):

```json
{"quantity":2}
```

Checkout (all fields required; no credit-card information):

```json
{"name":"Harshini","address":"123 Demo Street","city":"Seattle","postalCode":"98101","payment":"APPROVED"}
```

Use `DECLINED` for payment failure. The server rejects unknown fields, so client-supplied prices/totals are not accepted. Order totals come from stored product prices; order items retain a snapshot of names and unit prices.

Validation errors use this shape:

```json
{"message":"Please check the submitted fields","fields":{"quantity":"must be greater than or equal to 1"}}
```

Business errors also contain `message` and an empty `fields` object. Statuses: 400 invalid input/empty cart, 401 missing/expired credentials, 402 mock payment declined, 404 missing or unowned object, 409 duplicate email. Unhandled infrastructure errors use Spring Boot's default generic error shape; no stack trace is returned.

Names are limited to 80 characters, email to 254, registration passwords to 8–64 characters and at most 72 UTF-8 bytes (BCrypt limit), address to 200, city to 80, and postal code to 20. Email is stored lowercase. Postal code is generic text, so international formats are accepted. Product IDs are fixed in the seed migration; order IDs are UUIDs.

## macOS curl walkthrough

Use a new email if already registered. Copy the token from the first response:

```bash
curl -sS http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo","email":"demo1@example.test","password":"DemoPass!234"}'
export SHOP_TOKEN='paste-returned-token-here'
curl -sS -X PUT http://localhost:8080/api/cart/items/1 \
  -H "Authorization: Bearer $SHOP_TOKEN" -H 'Content-Type: application/json' \
  -d '{"quantity":2}'
curl -sS http://localhost:8080/api/orders \
  -H "Authorization: Bearer $SHOP_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Demo","address":"123 Demo Street","city":"Seattle","postalCode":"98101","payment":"APPROVED"}'
```

## Windows PowerShell walkthrough

```powershell
$body = @{name="Demo";email="demo2@example.test";password="DemoPass!234"} | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/register -ContentType "application/json" -Body $body
$headers = @{Authorization="Bearer $($auth.token)"}
Invoke-RestMethod -Method Put -Uri http://localhost:8080/api/cart/items/1 -Headers $headers -ContentType "application/json" -Body '{"quantity":2}'
$order = @{name="Demo";address="123 Demo Street";city="Seattle";postalCode="98101";payment="APPROVED"} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/orders -Headers $headers -ContentType "application/json" -Body $order
```

## Optional PostgreSQL verification

Connect using SQLTools or `docker compose exec db psql -U shopsphere -d shopsphere`:

```sql
SELECT id, email FROM customers ORDER BY id DESC LIMIT 5;
SELECT id, customer_id, total, status FROM orders ORDER BY placed_at DESC LIMIT 5;
SELECT order_id, name, unit_price, quantity, unit_price * quantity AS subtotal
FROM order_items ORDER BY id DESC LIMIT 10;
```

Do not print password hashes or session-token hashes as demo output. Database checks are optional investigation tools; the automated suites verify behavior through the service boundary.
