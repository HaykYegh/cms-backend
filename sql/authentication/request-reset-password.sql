UPDATE dashboard.administrators AS a
SET recovery_token = uuid_generate_v4(), recovery_sent_at = now()
FROM dashboard.administrators AS a2
       INNER JOIN customer.customers c ON a2.customer_id = c.customer_id AND c.active = TRUE AND (
           CASE WHEN (coalesce($1 , '') = '')
                   THEN (c.customer_package_id = 4)
                ELSE c.prefix = $1
           END
       )
WHERE a.email = $2
    RETURNING a.email AS "email", a.recovery_token AS "recoveryToken", a.recovery_sent_at AS "recoverySentAt";
