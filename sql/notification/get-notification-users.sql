SELECT DISTINCT (u.username)
FROM backend.users u
  INNER JOIN backend.user_devices ud ON u.user_id = ud.user_id
WHERE u.customer_id = {customer_id} AND u.user_country_id IN ({countries}) AND ud.platform_id IN ({platforms})
