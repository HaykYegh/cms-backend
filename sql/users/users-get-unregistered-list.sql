SELECT
  DISTINCT
  replace(username, $1, '') AS username,
  replace(username, $1, '') AS number,

  c.country_id,
  c.name,
  c.phone_code,
  c.sort_name               AS region_code,
  ua.email
FROM backend.user_attempts ua
  INNER JOIN internal.countries c ON c.sort_name = ua.region_code
WHERE ua.username NOT IN (SELECT username
                          FROM backend.users u
                          WHERE u.username = ua.username AND u.customer_id=$6) AND
      ua.last_attempt_at::DATE BETWEEN $2::DATE AND $3::DATE AND ua.customer_id=$6 LIMIT $4 OFFSET $5;