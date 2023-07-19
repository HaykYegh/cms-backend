SELECT
  count(DISTINCT u.user_id),
  date_trunc('day', u.created_at) :: DATE AS create_date
FROM backend.users u
WHERE u.user_country_id = $2 AND u.created_at::DATE BETWEEN $3 :: DATE AND $4 :: DATE AND u.customer_id=$1 AND u.status=1
GROUP BY create_date