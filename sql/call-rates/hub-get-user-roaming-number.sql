SELECT coalesce(urc.number, replace(u.username, $1, '')) AS number
FROM backend.users u
       LEFT JOIN backend.user_roaming_countries urc ON u.user_id = urc.user_id AND urc.active=TRUE
WHERE u.username = $3 AND u.customer_id = $2;