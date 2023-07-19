SELECT
  u.user_id,
  replace(username, $1, '') as username,
  u.user_country_id,
  u.created_at,
  coalesce(ua1.value, '') AS first_name,
  coalesce(ua2.value, '') AS last_name,
  c.name as country,
  u.email
FROM backend.users u
  LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
  LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
  LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.status = 1 AND u.customer_id = $6 AND u.created_at::DATE BETWEEN $4 :: DATE AND $5::DATE ORDER BY u.created_at DESC LIMIT $3 OFFSET $2;
