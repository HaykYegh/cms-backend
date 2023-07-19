SELECT
  u.user_id,
  u.user_country_id,
  u.created_at,
  coalesce(ua1.value, '') AS first_name,
  coalesce(ua2.value, '') AS last_name,

  replace(u.username, $1, '') AS username,
  coalesce(ua1.value, '') AS "firstName",
  coalesce(ua2.value, '') AS "lastName",
  u.created_at AS "createdAt",
  u.user_country_id AS  "userCountryId",
  u.user_id AS "userId",
  coalesce(u.email, '') AS email,
  c.name AS country
FROM backend.users u
  LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
  LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
  LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.status = 1 AND u.customer_id = $2 AND ( u.username LIKE '%'||$3||'%' OR u.email LIKE '%'||$3||'%') ORDER BY u.user_id LIMIT $4 OFFSET $5;
