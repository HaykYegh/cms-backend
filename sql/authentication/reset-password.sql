UPDATE dashboard.administrators AS a
SET password         = crypt($3, gen_salt('bf', 8)),
    recovery_token   = NULL,
    updated_at       = now(),
    recovery_sent_at = NULL
FROM dashboard.administrators AS a2
       INNER JOIN customer.customers c ON a2.customer_id = c.customer_id AND c.active = TRUE AND c.prefix = $1
WHERE a.recovery_token = $2 AND a.status = 1 AND a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours'
RETURNING a.updated_at + INTERVAL '4 hours' as "updatedAt";
