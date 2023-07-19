SELECT a.recovery_sent_at + INTERVAL '4 hours' AS "recoveryTokenSentAt", a.recovery_token AS "recoveryToken"
FROM dashboard.administrators a
         INNER JOIN customer.customers c ON a.customer_id = c.customer_id
WHERE a.recovery_token = $2
  AND a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours'
  AND ($1::TEXT IS NULL OR c.prefix = $1::TEXT);
