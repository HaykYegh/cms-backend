UPDATE backend.user_attempts
SET reset = TRUE, updated_at = now()
WHERE username = $1 AND customer_id=$2 AND last_attempt_at > now() - INTERVAL '1 day' RETURNING user_attempt_id;