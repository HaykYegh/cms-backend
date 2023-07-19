SELECT
  ud.user_device_id,
  ud.user_id,
  upper(ud.device_name) AS device_name,
  device_token,
  device_access_token,
  upper(p.name)         AS platform,
  platform_version,
  app_version,
  upper(l.value)        AS language,
  last_sign_in

FROM backend.user_devices ud
  LEFT JOIN internal.platforms p ON ud.platform_id = p.platform_id
  LEFT JOIN internal.languages l ON l.language_id = ud.language_id
    INNER JOIN backend.users u ON u.user_id=ud.user_id
WHERE u.customer_id=$3
ORDER BY ud.created_at
LIMIT $1
OFFSET $2;