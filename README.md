# voda-agents-api
Backend for a customer-registration agents mobile app.
Implements secure agent authentication (login/logout), agent profile retrieval, customer registration, recent customer registration activity (paginated & searchable), and logout with token revocation.

# TECH STACK
-Node.js, Express
-Prisma ORM + PostgreSQL
-JWT (access token with jti revocation)
-Jest + Supertest (e2e tests)
-Helmet, CORS, Rate limiting, HPP

# ARCHITECTURE OVERVIEW
-Layered Express app:
  -src/routes/* – route handlers
  -src/middleware/* – auth & request hardening
  -src/db/prisma.js – Prisma client (singleton)
-DB schema in prisma/schema.prisma with migrations.
-Logout uses revocation by jti (DB table RevokedToken).

# PREREQUISITES
-Node.js v20+
-Docker desktop running

# GETTING STARTED
1) Install dependencies
npm install

2) Environment variables
Copy and edit:
cp .env.example .env

Minimal .env file:
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voda_agents
  JWT_ACCESS_SECRET=super-secret-jwt-key 
  JWT_EXPIRES_IN=15m
  CORS_ORIGINS=http://localhost:5173
  NODE_ENV=development

generate JWT_ACCESS_SECRET using:-
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  

3) Database & migrations
-Create DB schema & generate client
  npx prisma migrate dev --name init

4)Create a demo agent by running 
  node prisma/seed.js
  This creates:
    phone: 255700000001
    pass : Agent@123
  change agent details in prisma/seed.js to create multiple agents

5) Run the server
-Dev
npm run dev

-Prod
npm start

Server: http://localhost:3000

# API REFERENCE
All state-changing endpoints require Content-Type: application/json and an Authorization header:
Authorization: Bearer <accessToken>

Health
  GET /health
  
  200 OK { "status": "ok" }

Auth
  1)POST http://localhost:3000/auth/login
    Authenticate an agent by phone/password.
    Body(JSON):-
      {
        "phone": "255700000001",
        "password": "Agent@123"
      }
    Response:-
      200 OK
        {
          "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
        }
    Errors:-
      400 – missing phone/password
      401 – invalid credentials
      403 – agent not active

  2)POST http://localhost:3000/auth/logout
    Revokes the current access token (via jti).
    Headers: Authorization: Bearer <accessToken>
    204 No Content on success
    401 if token is missing/invalid

Agent
  1)GET http://localhost:3000/agents/me
    Returns the logged-in agent profile.
    Headers: Authorization: Bearer <accessToken>
    Response:-
      200 OK
        {
          "id": "uuid",
          "name": "Jane Agent",
          "phone": "255700000001",
          "region": "Dar es Salaam",
          "district": "Ilala",
          "ward": "Upanga",
          "status": "ACTIVE"
        }
    Errors:-
      401 – missing/invalid token
      404 – agent not found

Customers
  1)POST http://localhost:3000/customers
    Create (register) a new customer.
    Headers: Authorization: Bearer <accessToken> 
    Body (JSON):-
      {
        "name": "John Doe",
        "dob": "1990-01-01",
        "region": "Dar es Salaam",
        "district": "Kinondoni",
        "ward": "Masaki",
        "nida": "12345678901234567890"
      }
    Rules:
      nida must be exactly 20 digits
      dob must be a valid date in the past
    Responses:-
      201 Created
        { "id": "uuid" }
    Errors:-
      400 – validation error (array in details)
      401 – missing/invalid token
      409 – duplicate NIDA
      
  2)GET http://localhost:3000/customers/agents/me/registrations
    Paginated, searchable list of recent registrations for the logged-in agent.
    Headers: Authorization: Bearer <accessToken>
    Query params:-
      page (default 1)
      pageSize (default 10, max 100)
      search (optional; matches name, nida, region, district, ward)
      example URL with params: 
        http://localhost:3000/customers/agents/me/registrations?page=1&pageSize=10&search=doe
    Responses:-
      200 Ok
      
      {
          "items": [
          {
                  "id": "89ac1d9d-418f-440f-bd7e-1f64053ca766",
                  "name": "Johnny Doe",
                  "dob": "1990-01-01T00:00:00.000Z",
                  "region": "Dar es Salaam",
                  "district": "Kinondoni",
                  "ward": "Masaki",
                  "nida": "12545678901234560895",
                  "agentId": "aa8c656f-59e4-4588-9f8e-9f4bec2f1e47",
                  "createdAt": "2025-09-29T19:16:36.462Z"
              }
          ],
          "page": 1,
          "pageSize": 10,
          "total": 1,
          "totalPages": 1
      }

# POSTMAN SETUP
-A postman collection is included to make testing the API easier
  File:
  'postman/voda-agents-api.postman_collection.json'
  -import this file into postman to get all endpoints pre-organized
  -you'll need to manually add env variables such as 'BASE_URL', 'JWT_ACCESS'
  -`BASE_URL`: http://localhost:3000 (when running locally) 
  Once imported, you can run: 
  - node prisma/seed.js and npm run dev in terminal
  - then in postman run the following routes in this order
    - **Auth → Login** → copy the token  
    - **Agents → Me** → paste token in Authorization header  
    - **Customers → Create** → test customer registration with NIDA validation
    - **Customers → Get** → get created customers

Alternatively you can
-Create a Collection in postman (e.g., “Voda Agents API”).
-Add the following requests 

1) Login
  # NOTE: run node prisma/seed.js to create agent
  Method: POST
  URL: http://localhost:3000/auth/login
  Body (raw JSON):
    { "phone": "{{phone}}", "password": "{{password}}" }
    //use the phone and password used in prisma/seed.js
  Use the access token returned in response body as bearer token when calling the rest of the    endpoints

2) Me
  Method: GET
  URL: http://localhost:3000/agents/me
  Headers:
    Authorization: Bearer {{accessToken}}
   accessToken from login call

4) Register Customer
  Method: POST
  URL: http://localhost:3000/customers
  Headers:
    Authorization: Bearer {{accessToken}}
    Content-Type: application/json
  Body:
  {
    "name": "Alice Alpha",
    "dob": "1991-03-03",
    "region": "Dar es Salaam",
    "district": "Ilala",
    "ward": "Upanga",
    "nida": "22222222222222222222"
  }

4) Activity
  Method: GET
  URL: http://localhost:3000/customers/agents/me/registrations?page=1&pageSize=10&search=alpha
  Headers:
    Authorization: Bearer {{accessToken}}

5) Logout
  Method: POST
    URL: http://localhost:300/auth/logout
  Headers:
    Authorization: Bearer {{accessToken}}
  After logout, calling agents/me again with the same token should return 401.

# TESTING
npm test
-Uses Jest + Supertest.
-CI runs tests on every PR/push.
-Rate limiting is disabled in NODE_ENV=test to avoid 429s during tests.

# SECURITY HARDENING
-Helmet headers (clickjacking/XSS/mime-sniffing mitigations)
-CORS allowlist via CORS_ORIGINS (comma-separated)
-JSON-only for mutating routes; body size capped at 100kb
-HPP (HTTP Parameter Pollution) protection

-Rate limiting:
  Global: 100 req/min/IP
  Login: 10 req/min/IP
-JWT revocation by jti on logout (DB table RevokedToken)
-Consistent 401 responses for auth failures

# CI/CD
-GitHub Actions workflow:
  Install (npm ci)
  Prisma client generate + migrations
  Run test suite
Triggers on PRs to dev & main, and direct pushes.
(Locally) you can run the same steps: npx prisma generate && npx prisma migrate deploy && npm test.

# TROUBLESHOOTING
Prisma can’t reach DB (P1001)
-Ensure Postgres is running and DATABASE_URL is correct (on Windows try 127.0.0.1).

EPERM on Windows during prisma generate
-Kill all node processes; delete node_modules/.prisma and reinstall

Login 401 in Postman
-Check Content-Type: application/json and correct phone/password; ensure agent status=ACTIVE.

Duplicate NIDA (409)
-Use a fresh 20-digit nida for each registration.

CORS error in browser
-Add your frontend origin to CORS_ORIGINS in .env (comma-separated list) and restart the server.
CI Tests failure
-Tests flaky due to async, run from postman for validity 

# ROOM FOR IMPROVEMENTS
Refresh tokens with rotation & blacklist on compromise
Observability: request logging, metrics, trace IDs
Idempotency keys for customer registration
Data isolation in tests to avoid false fails



