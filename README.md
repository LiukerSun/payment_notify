# pay-notify Docker deployment

This folder contains a minimal notify receiver for hmjiasu and Docker config for local build and deployment.

Quickstart (local test):

1. Copy and fill env: `cp deploy/pay-notify/env.sample deploy/pay-notify/.env` and set `HMJIASU_KEY` and `HMJIASU_PID` (and optional `DATABASE_URL`).
2. Build image locally:

   ```bash
   docker compose -f deploy/docker-compose.yml build
   ```

3. Start service locally:

   ```bash
   docker compose -f deploy/docker-compose.yml up -d
   ```

4. Check logs:

   ```bash
   docker compose -f deploy/docker-compose.yml logs -f pay-notify
   ```

5. Test notify endpoint (local):

   ```bash
   # example curl (you should generate a proper sign value)
   curl -X POST http://localhost:4000/payment/hmjiasu/notify -d "pid=xxx&out_trade_no=test-1&trade_status=TRADE_SUCCESS&money=1.00&sign=xxx"
   ```

Production notes:
- Use HTTPS and a reverse proxy such as Nginx.
- For secrets, prefer Docker Swarm secrets, Kubernetes secrets, or an external secret manager. If you must use env files, keep them out of version control and restrict file permissions.
- Point the payment provider `notify_url` to `https://pay.liukersun.com/payment/hmjiasu/notify`.

