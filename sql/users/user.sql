SELECT
  u.user_id,
  replace(u.username, $1, '') as username,
  u.user_country_id,
  u.created_at,
  coalesce(ua1.value, '') AS first_name,
  coalesce(ua2.value, '') AS last_name,
  expun.first_name AS first_name_nick,
  expun.last_name AS last_name_nick,
  c.name as country,
  u.email as email,
  ua3.value as nick_email,
  u.nickname as nick_name,
  json_agg(json_build_object('name', chu.subject, 'room_name', chu.room_name)) AS channels
FROM backend.users u
  LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
  LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
  LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
  LEFT JOIN extended_profile.user_names expun ON u.user_id = expun.user_id
  LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
  LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id

WHERE u.customer_id = $3 AND u.user_id = $2
Group By u.user_id, u.user_country_id, u.created_at, ua1.value, ua2.value, c.name, u.email, expun.first_name, expun.last_name, ua3.value

