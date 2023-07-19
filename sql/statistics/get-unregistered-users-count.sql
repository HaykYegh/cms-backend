SELECT count(DISTINCT ua.username) AS count, ua.last_attempt_at::DATE as "createdAt"
FROM backend.user_attempts ua FULL
       OUTER JOIN backend.users u USING (username)
WHERE u.username IS NULL AND ua.last_attempt_at::DATE BETWEEN $2::DATE AND $3 :: DATE AND
        ua.customer_id = $1
GROUP BY 2;