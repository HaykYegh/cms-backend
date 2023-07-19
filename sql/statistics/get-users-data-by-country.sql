SELECT c.country_id,
       c.sort_name AS sort_name,
       c.name AS country_name,
       count(u.user_id) AS registered_users_count,
       COUNT(ud1.user_id) FILTER (WHERE ud1.platform_id = 1) AS ios,
       COUNT(ud1.user_id) FILTER (WHERE ud1.platform_id = 2) AS android,
       coalesce(uaa.unregistered, 0) as not_verified_users_count

FROM backend.users u
       INNER JOIN internal.countries c ON u.user_country_id = c.country_id
       LEFT JOIN (SELECT DISTINCT ON (ud.user_id) ud.user_id, ud.platform_id
                  FROM backend.user_devices ud
                  WHERE (ud.platform_id = 1 OR ud.platform_id = 2) AND ud.user_device_status_id = 1) ud1
         ON u.user_id = ud1.user_id
       LEFT JOIN (SELECT count(DISTINCT ua.username) AS unregistered, ua.region_code
                  FROM backend.user_attempts ua FULL
                         OUTER JOIN backend.users u USING (username)
                  WHERE u.username IS NULL AND
                          ua.last_attempt_at::DATE BETWEEN $2 :: DATE AND $3 :: DATE AND
                          ua.customer_id = $1 AND ua.region_code IS NOT NULL  AND
                  ((($4::TEXT = 'EMAIL' AND (u.email IS NOT NULL)) OR ($4::TEXT = 'PHONE' AND (u.email IS NULL))) OR ($4::TEXT = 'ALL'))
                  GROUP BY ua.region_code) uaa ON c.sort_name = uaa.region_code

WHERE u.created_at::DATE BETWEEN $2 :: DATE AND $3 :: DATE AND u.customer_id = $1 AND
        u.username IS NOT NULL AND u.status = 1 AND ((($4::TEXT = 'EMAIL' AND (u.email IS NOT NULL)) OR ($4::TEXT = 'PHONE' AND (u.email IS NULL))) OR ($4::TEXT = 'ALL'))
GROUP BY c.country_id, uaa.unregistered
ORDER BY c.country_id ASC;