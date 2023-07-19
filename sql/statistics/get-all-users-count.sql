SELECT
  count(u.user_id) AS count
  FROM backend.users u
WHERE u.customer_id = $1 AND u.status=1;
