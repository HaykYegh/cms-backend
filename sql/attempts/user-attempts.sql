SELECT
  ua.user_attempt_id,
  replace(ua.username, $1, '') as username,
  ua.last_attempt_at,
  c.name as country,
  ua.email as email
FROM backend.user_attempts ua
  INNER JOIN internal.countries c ON c.sort_name = ua.region_code
 WHERE ua.username = $5 AND ua.customer_id=$4

LIMIT $2
OFFSET $3;
