SELECT u.user_id,
       replace(username, $2, '') AS username,
       u.user_country_id,
       u.created_at,
       coalesce(ua1.value, '') AS first_name,
       coalesce(ua2.value, '') AS last_name,
       c.name AS country
FROM backend.users u
       INNER JOIN virtual_network.network_users nu ON u.user_id = nu.user_id
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.status = 1 AND u.customer_id = $1 AND
        (($4::DATE IS NULL AND $5::DATE IS NULL) OR (u.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE))
ORDER BY u.created_at
LIMIT $6
OFFSET $7;