SELECT
  ua.user_attempt_id,
  c.country_id,
  ua.region_code,
  c.name                         AS country_name,
  replace(ua.username, $1, '') AS username,
  ua.last_attempt_at,
  ua.reset,
  ua.email as email
FROM backend.user_attempts ua INNER JOIN internal.countries c ON ua.region_code = c.sort_name
WHERE ua.username = $2 AND ua.customer_id=$5 ORDER BY ua.user_attempt_id LIMIT $3 OFFSET $4;