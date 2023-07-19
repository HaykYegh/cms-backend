SELECT
  count(DISTINCT user_id) AS count,
  c.country_id,
  c.name,
  c.sort_name
FROM backend.users u INNER JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.status = 1 AND customer_id = $3 AND u.created_at::DATE BETWEEN $1 :: DATE AND $2::DATE
GROUP BY c.country_id ORDER BY count DESC;