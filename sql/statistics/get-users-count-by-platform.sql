SELECT
       COUNT(ud1.user_id) FILTER (WHERE ud1.platform_id = 1) AS ios,
       COUNT(ud1.user_id) FILTER (WHERE ud1.platform_id = 2) AS android
FROM backend.users u
       LEFT JOIN (SELECT DISTINCT ON (ud.user_id) ud.user_id, ud.platform_id
                  FROM backend.user_devices ud
                  WHERE (ud.platform_id = 1 OR ud.platform_id = 2) AND ud.user_device_status_id = 1) ud1
         ON u.user_id = ud1.user_id
WHERE u.created_at::DATE BETWEEN $2 :: DATE AND $3 :: DATE AND u.customer_id = $1 AND
        u.status = 1