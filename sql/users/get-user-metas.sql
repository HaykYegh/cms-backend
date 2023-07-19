SELECT u.user_id as "userId",
       u.email,
       u.username,
       u.created_at as "createdAt",
       u.password,
       coalesce(json_agg(ui) FILTER (WHERE ui.user_id IS NOT NULL), NULL) AS images,
       json_agg(c) AS country,
       json_agg(c2) AS customer,
       json_agg(ud) AS devices,
       coalesce(json_agg(urc) FILTER (WHERE urc.user_id IS NOT NULL), NULL) AS "roamingCountries",
       coalesce(json_agg(uat) FILTER (WHERE uat.username IS NOT NULL), NULL) AS attempts,
       coalesce(json_agg(json_build_object(
                           'attributeId', ua.attribute_id,
                           'attributeName', a.name,
                           'attributeValue', ua.value
                             )) FILTER (WHERE ua.user_id IS NOT NULL), NULL) AS attributes
FROM backend.users u
       LEFT JOIN backend.user_images ui ON u.user_id = ui.user_id
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
       LEFT JOIN backend.user_devices ud ON u.user_id = ud.user_id
       LEFT JOIN backend.user_roaming_countries urc ON u.user_id = urc.user_id
       LEFT JOIN backend.user_attributes ua ON u.user_id = ua.user_id
       LEFT JOIN core.attributes a ON ua.attribute_id = a.attribute_id
       LEFT JOIN backend.user_attempts uat ON u.username = uat.username
       LEFT JOIN customer.customers c2 ON u.customer_id = c2.customer_id
WHERE u.user_id = $2 AND u.customer_id=$1
GROUP BY u.user_id;