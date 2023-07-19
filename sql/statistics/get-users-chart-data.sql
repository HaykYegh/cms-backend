SELECT
  count(DISTINCT u.user_id),
  date_trunc('day', u.created_at) :: DATE AS create_date
FROM backend.users u
WHERE u.created_at::DATE BETWEEN $2 :: DATE AND $3 :: DATE AND u.customer_id=$1 AND u.status=1
GROUP BY create_date