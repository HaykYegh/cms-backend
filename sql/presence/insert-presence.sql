WITH getUserDevices
     AS (SELECT ud.user_id, ud.user_device_id, u.customer_id, ud.device_token
         FROM backend.user_devices ud
                INNER JOIN backend.users u ON ud.user_id = u.user_id AND u.username = $2
                INNER JOIN customer.customers cu ON u.customer_id = cu.customer_id AND cu.prefix = $1
         WHERE ud.device_token = $3 OR ud.device_token = md5(u.username))
INSERT INTO backend.user_presence_instants(user_id, user_device_id, customer_id, is_available, created_at)
SELECT gud.user_id, gud.user_device_id, gud.customer_id, $5::BOOLEAN, to_timestamp($4::BIGINT / 1000)
FROM getUserDevices gud RETURNING user_presence_instant_id AS "userPresenceInstantId";