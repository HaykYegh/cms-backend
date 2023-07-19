const serviceQueries = require('./services');
const usersV2 = require('./users');


const sqlQueries = {
  payments: {
    customers: {
      get: {
        one: `SELECT n.network_id AS "networkId",
       n.stripe_id AS "stripeId"
FROM virtual_network.networks n
       INNER JOIN virtual_network.network_admins na ON n.network_id = na.network_id
       INNER JOIN dashboard.administrators a ON na.admin_id = a.administrator_id
WHERE n.customer_id = $1 AND na.admin_id = $2 AND n.network_id = $3 AND n.active = TRUE AND a.status = 1 AND n.stripe_id IS NOT NULL;`
      },
      create: `UPDATE virtual_network.networks
SET stripe_id=$4
WHERE network_id = (SELECT n.network_id
                    FROM virtual_network.networks n
                           INNER JOIN virtual_network.network_admins na ON n.network_id = na.network_id
                           INNER JOIN dashboard.administrators a
                                      ON na.admin_id = a.administrator_id
                    WHERE n.customer_id = $1 AND na.admin_id = $2 AND n.network_id = $3 AND n.active = TRUE AND
                          a.status = 1) RETURNING stripe_id AS "stripeId", network_id AS "networkId";`
    },
    usageReport: {
      getNetworkSubscriptions: `SELECT n.network_id AS "networkId",
       n.stripe_id AS "stripeId",
       n.nickname,
       n.label,
       json_build_object(
           'subscriptionId', s.subscription_id,
           'objectId', s.object_id,
           'items', json_agg(
               json_build_object(
                   'subscriptionItemId', si.subscription_item_id,
                   'objectId', si.object_id,
                   'planType', cast(si.subscription_plan_type_id AS INT)
                 ))
         )
         AS subscription
FROM virtual_network.networks n
       INNER JOIN payment.subscriptions s ON n.network_id = s.network_id
       INNER JOIN payment.subscription_items si ON s.subscription_id = si.subscription_id
WHERE n.active = TRUE AND n.stripe_id IS NOT NULL  AND n.network_id=$1
GROUP BY n.network_id, s.subscription_id;`,
      getNetworkActivities: `SELECT na.user_id AS "userId", json_agg(
    json_build_object('userId', na.user_id, 'createAt', na.created_at, 'type', na.network_activity_type_id, 'timestamp',
                      extract(EPOCH FROM na.created_at AT TIME ZONE 'utc')) ORDER BY (na.created_at) ASC ) AS "activities"
FROM virtual_network.network_activities na
       INNER JOIN virtual_network.networks n ON na.network_id = n.network_id
WHERE na.network_id = $1 AND na.created_at IS NOT NULL AND n.customer_id = 1 AND
      na.created_at::TIMESTAMPTZ BETWEEN to_timestamp($2::INT) AND to_timestamp($3::INT)
GROUP BY na.user_id;`,
      reportUsage: 'SELECT payment."reportUsage"($1, $2, $3, $4, $5, $6) AS usage;'
    },

    products: {
      getDefaultProduct: `SELECT subscription_product_id AS "subscriptionProductId",
       customer_id AS "customerId",
       object_id AS "objectId"
FROM payment.subscription_products WHERE customer_id=$1;`
    },
    subscriptions: {
      store: 'SELECT payment."createSubscription"($1, $2, $3, $4, $5, $6) as subscription;'
    },


    getCustomer: 'SELECT stripe_customer_id AS "customerId", network_id AS "networkId", token AS "token", created_at AS "createdAt" FROM stripe.stripe_customers WHERE network_id = $1;',
    setCustomer: 'INSERT INTO stripe.stripe_customers (network_id, token, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING stripe_customer_id AS "customerId", network_id AS "networkId", token AS "token", created_at AS "createdAt"',
    getCards: 'SELECT c1.card_id as "cardId", (c1.meta->\'card\')::JSONB AS "card", sc.stripe_customer_id AS "customerId", c1.created_at AS "createdAt", c1.default AS "isDefault" FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id INNER JOIN virtual_network.networks n ON sc.network_id = n.network_id WHERE sc.network_id=$1 AND n.active=TRUE LIMIT $2 OFFSET $3;',
    getCard: 'SELECT c1.card_id AS "cardId", c1.token AS "cardToken", c1.customer_id AS "customerId", sc.token AS "customerToken", (c1.meta->\'card\')::JSON AS "card", c1.default AS "isDefault" FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id WHERE sc.network_id=$1 AND c1.card_id=$2;',
    setCard: 'INSERT INTO stripe.cards(customer_id, token, meta, created_at, updated_at, "default") VALUES ($1, $2, $3, NOW(), NOW(), $4) RETURNING customer_id AS "customerId", token, created_at AS "createdAt", "default" AS "isDefault";',
    deleteCard: 'DELETE FROM stripe.cards WHERE card_id=(SELECT c1.card_id FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id AND sc.network_id=$1 WHERE c1.card_id=$2);',
    setDefaultCard: 'WITH removeDefaults AS (UPDATE stripe.cards SET "default" = FALSE WHERE card_id IN (SELECT c1.card_id FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id AND sc.network_id = $1) AND "default" = TRUE) UPDATE stripe.cards SET "default" = TRUE WHERE card_id = (SELECT c2.card_id FROM stripe.cards c2 INNER JOIN stripe.stripe_customers sc ON c2.customer_id = sc.stripe_customer_id AND sc.network_id = $1 WHERE c2.card_id = $2) AND "default" = FALSE RETURNING card_id AS "cardId";',
  },
  users: {
    get: {
      recordsWidthEmail: `SELECT DISTINCT u.username AS "username",
                u.email AS "email"
                    FROM backend.users u
                    WHERE u.username IN
                    (SELECT * FROM UNNEST
                        ($1::text[]))`,
      recordsWidthNickname: `SELECT DISTINCT u.username AS "username",
                u.nickname AS "nickname"
                    FROM backend.users u
                    WHERE u.username IN
                    (SELECT * FROM UNNEST
                        ($1::text[]))`,
      recordsWidthUsernames: `SELECT u.username AS "username",
                u.email AS "email"
                    FROM backend.users u
                    WHERE (u.email=$1 OR u.nickname=$1) AND u.customer_id=$2`,
      records: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getUserDevicesCount AS (
        SELECT ud2.user_id AS user_id, count(ud2.platform_id) AS "count"
                        FROM backend.user_devices ud2
                                 INNER JOIN backend.users u ON ud2.user_id = u.user_id
                        WHERE u.customer_id = $1::INT GROUP BY ud2.user_id
     ),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT u.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.nickname AS "nickname",
       u.email,
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       u.is_subscribed AS "isSubscribed",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       expun.first_name AS "firstNameNick",
       expun.last_name AS "lastNameNick",
       ua3.value AS "nickEmail",
       (CASE WHEN ug.user_group_id IS NOT NULL THEN json_build_object('groupId', ug.user_group_id, 'groupName', ug.name) ELSE NULL END) AS "userGroup",
       json_agg(json_build_object('name', chu.subject, 'room_name', chu.room_name)) AS channels,
       COALESCE(udc.count, 0) AS "devicesCount"

FROM backend.users u
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN extended_profile.user_names expun ON u.user_id = expun.user_id
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id
         LEFT JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id
         LEFT JOIN getUserDevicesCount udc ON u.user_id = udc.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($22::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($22::TEXT) || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($23::TEXT IS NULL OR ua3.value LIKE $23::TEXT || '%') AND
      ($24::BOOLEAN IS NULL OR u.is_subscribed = $24::BOOLEAN)
GROUP BY u.user_id, ua1.value, ua2.value, ua3.value, ug.user_group_id, expun.first_name, expun.last_name
HAVING ($21::TEXT IS NULL OR ($21 IS NOT NULL AND $21 = ANY(array_agg(chu.room_name))))
ORDER BY u.user_id DESC
LIMIT $19
    OFFSET $20;`,
      recordsByDate: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getUserDevicesCount AS (
        SELECT ud2.user_id AS user_id, count(ud2.platform_id) AS "count"
                        FROM backend.user_devices ud2
                                 INNER JOIN backend.users u ON ud2.user_id = u.user_id
                        WHERE u.customer_id = $1::INT GROUP BY ud2.user_id
     ),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT u.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.nickname AS "nickname",
       u.email,
       u.is_subscribed AS "isSubscribed",
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       expun.first_name AS "firstNameNick",
       expun.last_name AS "lastNameNick",
       ua3.value AS "nickEmail",
       (CASE WHEN ug.user_group_id IS NOT NULL THEN json_build_object('groupId', ug.user_group_id, 'groupName', ug.name) ELSE NULL END) AS "userGroup",
       json_agg(
           json_build_object('name', chu.subject, 'room_name', chu.room_name)) AS channels,
       COALESCE(udc.count, 0) AS "devicesCount"

FROM backend.users u
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN extended_profile.user_names expun ON u.user_id = expun.user_id
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id
         LEFT JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         LEFT JOIN getUserDevicesCount udc ON u.user_id = udc.user_id
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status != 0 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
        ((u.deleted_at :: DATE IS NULL AND u.status = 1) OR (u.deleted_at :: DATE IS NOT NULL AND u.deleted_at :: DATE > $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($22::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($22::TEXT) || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND 
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($23::TEXT IS NULL OR ua3.value LIKE $23::TEXT || '%') AND
      ($24::BOOLEAN IS NULL OR u.is_subscribed = $24::BOOLEAN)
GROUP BY u.user_id, ua1.value, ua2.value, ua3.value, ug.user_group_id, expun.first_name, expun.last_name
HAVING ($21::TEXT IS NULL OR ($21 IS NOT NULL AND $21 = ANY(array_agg(chu.room_name))))
ORDER BY u.user_id DESC
LIMIT $19
    OFFSET $20;`,
      recordsWidthoutChannel: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
      getUserDevicesCount AS (
        SELECT ud2.user_id AS user_id, count(ud2.platform_id) AS "count"
                        FROM backend.user_devices ud2
                                 INNER JOIN backend.users u ON ud2.user_id = u.user_id
                        WHERE u.customer_id = $1::INT GROUP BY ud2.user_id
     ),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     ),
     getChannels AS (SELECT chu.user_id, json_agg(
                                           json_build_object('name', chu.subject, 'room_name', chu.room_name)) AS channels
                     FROM backend.user_channels chu
                     GROUP BY chu.user_id)
SELECT u.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.nickname AS "nickname",
       u.email,
       u.created_at AS "createdAt",
       u.deleted_at AS "deletedAt",
       u.user_country_id AS "countryId",
       u.is_subscribed AS "isSubscribed",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       expun.first_name AS "firstNameNick",
       expun.last_name AS "lastNameNick",
       ua3.value AS "nickEmail",
       (CASE WHEN ug.user_group_id IS NOT NULL THEN json_build_object('groupId', ug.user_group_id, 'groupName', ug.name) ELSE NULL END) AS "userGroup",
       chu.channels AS "channels",
       COALESCE(udc.count, 0) AS "devicesCount"

FROM backend.users u
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN extended_profile.user_names expun ON u.user_id = expun.user_id
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id
         LEFT JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id
         LEFT JOIN getUserDevicesCount udc ON u.user_id = udc.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id
         LEFT JOIN getChannels chu ON u.user_id = chu.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($22::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($22::TEXT) || '%') AND
      ($21 :: TEXT IS NULL OR
        (CASE WHEN chu.channels IS NOT NULL THEN ($21 IN (SELECT room_name FROM json_to_recordset(chu.channels) as x(room_name text)
        WHERE room_name=$21) )ELSE NULL END)) AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND 
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($23::TEXT IS NULL OR ua3.value LIKE $23::TEXT || '%') AND
      ($24::BOOLEAN IS NULL OR u.is_subscribed = $24::BOOLEAN)
ORDER BY u.user_id DESC
LIMIT $19
    OFFSET $20`,
      recordsWidthoutChannelByDate: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getUserDevicesCount AS (
        SELECT ud2.user_id AS user_id, count(ud2.platform_id) AS "count"
                        FROM backend.user_devices ud2
                                 INNER JOIN backend.users u ON ud2.user_id = u.user_id
                        WHERE u.customer_id = $1::INT GROUP BY ud2.user_id
     ),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     ),
     getChannels AS (SELECT chu.user_id, json_agg(
                                           json_build_object('name', chu.subject, 'room_name', chu.room_name)) AS channels
                     FROM backend.user_channels chu
                     GROUP BY chu.user_id)
SELECT u.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.nickname AS "nickname",
       u.email,
       u.is_subscribed AS "isSubscribed",
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       expun.first_name AS "firstNameNick",
       expun.last_name AS "lastNameNick",
       ua3.value AS "nickEmail",
       (CASE WHEN ug.user_group_id IS NOT NULL THEN json_build_object('groupId', ug.user_group_id, 'groupName', ug.name) ELSE NULL END) AS "userGroup",
       chu.channels AS "channels",
       COALESCE(udc.count, 0) AS "devicesCount"

FROM backend.users u
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN extended_profile.user_names expun ON u.user_id = expun.user_id
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id
         LEFT JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         LEFT JOIN getUserDevicesCount udc ON u.user_id = udc.user_id
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id
         LEFT JOIN getChannels chu ON u.user_id = chu.user_id

WHERE u.status != 0 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND 
      ((u.deleted_at :: DATE IS NULL AND u.status = 1) OR (u.deleted_at :: DATE IS NOT NULL AND u.deleted_at :: DATE > $3 :: DATE)) AND 
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($22::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($22::TEXT) || '%') AND
      ($21 :: TEXT IS NULL OR
        (CASE WHEN chu.channels IS NOT NULL THEN ($21 IN (SELECT room_name FROM json_to_recordset(chu.channels) as x(room_name text)
        WHERE room_name=$21) )ELSE NULL END)) AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($23::TEXT IS NULL OR ua3.value LIKE $23::TEXT || '%') AND
      ($24::BOOLEAN IS NULL OR u.is_subscribed = $24::BOOLEAN)
ORDER BY u.user_id DESC
LIMIT $19
    OFFSET $20`,
      count: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id

         LEFT JOIN getUserDevices ud
                   ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      ($19::TEXT IS NULL OR ($19 IS NOT NULL AND chu.room_name = $19::TEXT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($20::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($20::TEXT) || '%') AND
      ($21::TEXT IS NULL OR ua3.value LIKE $21::TEXT || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($22::BOOLEAN IS NULL OR u.is_subscribed = $22::BOOLEAN);`,
      countByDate: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id

         LEFT JOIN getUserDevices ud
                   ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status != 0 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ((u.deleted_at :: DATE IS NULL AND u.status = 1) OR (u.deleted_at :: DATE IS NOT NULL AND u.deleted_at :: DATE > $3 :: DATE)) AND 
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      ($19::TEXT IS NULL OR ($19 IS NOT NULL AND chu.room_name = $19::TEXT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($20::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($20::TEXT) || '%') AND
      ($21::TEXT IS NULL OR ua3.value LIKE $21::TEXT || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($22::BOOLEAN IS NULL OR u.is_subscribed = $22::BOOLEAN);`,
      countWidthoutChannel: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
         
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id

         LEFT JOIN getUserDevices ud
                   ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($19::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($19::TEXT) || '%') AND
      ($20::TEXT IS NULL OR ua3.value LIKE $20::TEXT || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($21::BOOLEAN IS NULL OR u.is_subscribed = $21::BOOLEAN);`,
      countWidthoutChannelByDate: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
         SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
         SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                         THEN TRUE
                     ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
         SELECT utm.user_id, sum(utm.value) AS "callCount"
         FROM metrics.user_timeline_metrics utm
                  INNER JOIN metrics.customer_timeline ct
                             ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
               utm.metric_context_type_id = 11
         GROUP BY utm.user_id
     ),
     getMessageCounts AS (
         SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
         FROM metrics.user_timeline_metrics utm1
                  INNER JOIN metrics.customer_timeline ct
                             ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
         GROUP BY utm1.user_id
     ),
     getCallDuration AS (
         SELECT utm2.user_id, sum(utm2.value) AS "duration"
         FROM metrics.user_timeline_metrics utm2
                  INNER JOIN metrics.customer_timeline ct
                             ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
         WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
         GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
         
         LEFT JOIN backend.user_attributes ua1
                   ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
         LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua3.attribute_id = 7
         LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id

         LEFT JOIN getUserDevices ud
                   ON u.user_id = ud.user_id
         LEFT JOIN getNetworks n ON u.user_id = n.user_id

         LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
         LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
         LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status != 0 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ((u.deleted_at :: DATE IS NULL AND u.status = 1) OR (u.deleted_at :: DATE IS NOT NULL AND u.deleted_at :: DATE > $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT)) AND
      ($16::TEXT IS NULL OR u.username LIKE $16::TEXT || '%') AND
      ($19::TEXT IS NULL OR LOWER(u.nickname) LIKE LOWER($19::TEXT) || '%') AND
      ($20::TEXT IS NULL OR ua3.value LIKE $20::TEXT || '%') AND
      ($17::TEXT IS NULL OR LOWER(u.email) LIKE LOWER($17::TEXT) || '%') AND
      ($18::INT IS NULL OR (($18::INT = -1 AND ugm.user_group_id IS NULL) OR ugm.user_group_id=$18)) AND
      ($21::BOOLEAN IS NULL OR u.is_subscribed = $21::BOOLEAN);`,
    },
    create: `INSERT INTO backend.users(customer_id, username, password, created_at, updated_at, user_country_id,
                          status, email, nickname)
VALUES ($1::INT, $2::TEXT, crypt($3::TEXT, gen_salt('bf', 8)), NOW(), NOW(),
        (SELECT ca.country_id FROM internal.countries ca WHERE ca.sort_name = $4::TEXT), 1,
        $5::TEXT, $6::TEXT) RETURNING user_id AS "userId";`,
    recreate: `UPDATE backend.users
                 SET status = 1,
                 password = crypt($2 :: TEXT, gen_salt('bf', 8)),
                 updated_at = NOW(),
                 deleted_at = NULL
               WHERE user_id=$1 RETURNING user_id AS "userId";`,
    createCache: `SELECT u.user_id AS "userId",
       u.username AS "username",
       json_build_object(
           'customerId', ca.customer_id,
           'prefix', ca.prefix,
           'name', ca.name,
           'currency', ca.currency,
           'businessNumber', ca.customer_business_number,
           'multiDevice', cat.value
         ) AS customer,
       json_build_object(
           'countryId', cn.country_id,
           'regionCode', cn.sort_name,
           'sortName', cn.sort_name,
           'name', cn.name,
           'phoneCode', cn.phone_code
         ) AS country
FROM backend.users u
       INNER JOIN customer.customers ca ON u.customer_id = ca.customer_id
       LEFT JOIN customer.customer_attributes cat ON ca.customer_id = cat.customer_id
       LEFT JOIN internal.countries cn ON u.user_country_id = cn.country_id
WHERE u.user_id = $1;`,
    getUsers: 'SELECT u.user_id,\n' +
      '       replace(username, $2, \'\') AS username,\n' +
      '       u.user_country_id,\n' +
      '       u.created_at,\n' +
      '       coalesce(ua1.value, \'\') AS first_name,\n' +
      '       coalesce(ua2.value, \'\') AS last_name,\n' +
      '       c.name AS country,\n' +
      '       u.email,\n' +
      '       u.user_id AS "userId",\n' +
      '       u.created_at AS "createdAt",\n' +
      '       u.is_subscribed AS "isSubscribed",\n' +
      '       u.user_country_id AS "countryId",\n' +
      '       coalesce(ua1.value, \'\') AS "firstName",\n' +
      '       coalesce(ua2.value, \'\') AS lastName\n' +
      'FROM backend.users u\n' +
      '       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.status = 1 AND u.customer_id = $1 AND u.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE\n' +
      'ORDER BY u.created_at DESC\n' +
      'LIMIT $5\n' +
      'OFFSET $6;',
    searchUser: 'SELECT\n' +
      '  u.user_id,\n' +
      '  u.user_country_id,\n' +
      '  u.created_at,\n' +
      '  coalesce(ua1.value, \'\') AS first_name,\n' +
      '  coalesce(ua2.value, \'\') AS last_name,\n' +
      '\n' +
      '  replace(u.username, $2, \'\') AS username,\n' +
      '  coalesce(ua1.value, \'\') AS "firstName",\n' +
      '  coalesce(ua2.value, \'\') AS "lastName",\n' +
      '  u.created_at AS "createdAt",\n' +
      '  u.is_subscribed AS "isSubscribed",\n' +
      '  u.user_country_id AS  "userCountryId",\n' +
      '  u.user_id AS "userId",\n' +
      '  coalesce(u.email, \'\') AS email,\n' +
      '  c.name AS country\n' +
      'FROM backend.users u\n' +
      '  LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '  LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '  LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.status = 1 AND u.customer_id = $1 AND ( u.username LIKE \'%\'||$3||\'%\' OR u.email LIKE \'%\'||$3||\'%\') ORDER BY u.user_id LIMIT $4 OFFSET $5;\n',
    killUser: 'SELECT backend."deleteUser"($1, $2)',
    getKilledUsers: `WITH getUserDevicesCount AS (
                SELECT ud2.user_id AS user_id, count(ud2.platform_id) AS "count"
                FROM backend.user_devices ud2
                         INNER JOIN backend.users u ON ud2.user_id = u.user_id
                WHERE u.customer_id = $1::INT
                GROUP BY ud2.user_id
            )
            SELECT u.user_id         AS "userId",
                   u.username,
                   u.user_country_id AS "countryId",
                   u.customer_id     AS "customerId",
                   u.created_at      AS "createdAt",
                   u.is_subscribed   AS "isSubscribed",
                   u.email           AS "email",
                   u.deleted_at      AS "deletedAt",
                   COALESCE(ud.count) AS "devicesCount"
            FROM backend.users u
                LEFT JOIN getUserDevicesCount ud on u.user_id = ud.user_id
            WHERE deleted_at IS NOT NULL AND 
            ($2::DATE IS NULL OR ($2::DATE IS NOT NULL AND u.deleted_at::DATE >= $2::DATE)) AND
            ($3::DATE IS NULL OR ($3::DATE IS NOT NULL AND u.created_at::DATE >= $3::DATE)) AND
            ($4::DATE IS NULL OR ($4::DATE IS NOT NULL AND u.created_at::DATE <= $4::DATE)) AND
             u.customer_id = $1 AND
              ($5::BOOLEAN IS NULL OR ($5::BOOLEAN IS NOT NULL AND ud.count > 0));`,
    getUser: 'SELECT u.user_id AS "userId",\n' +
      '       u.username,\n' +
      '       u.user_country_id AS "countryId",\n' +
      '       u.customer_id AS "customerId",\n' +
      '       u.created_at AS "createdAt",\n' +
      '       u.is_subscribed AS "isSubscribed",\n' +
      '       coalesce(ua1.value, \'\') AS "firstName",\n' +
      '       coalesce(ua2.value, \'\') AS "lastName",\n' +
      '       c.name AS country,\n' +
      '       u.email AS email\n' +
      'FROM backend.users u\n' +
      '       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.customer_id = $1 AND u.user_id = $2;',
    total: {
      users: {
        count: `SELECT cast(count(1) AS NUMERIC) AS count
FROM backend.users u
       LEFT JOIN virtual_network.network_users nu ON u.user_id = nu.user_id
WHERE u.customer_id = $1 AND u.status = 1 AND ($2::INT IS NULL OR nu.network_id = $2::INT);`
      }
    },
    search: {
      user: `SELECT u.user_id AS "userId",
       replace(u.username, $2, '') AS username,
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       u.created_at AS "createdAt",
       u.user_country_id AS "userCountryId",
       coalesce(u.email, '') AS email,
       c.name AS country
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
       LEFT JOIN virtual_network.network_users nu ON u.user_id = nu.user_id
WHERE u.status = 1 AND u.customer_id = $1 AND (u.username LIKE '%' || $4 || '%' OR u.email LIKE '%' || $4 || '%') AND ($3::INT IS  NULL OR nu.network_id=$3::INT)
ORDER BY u.user_id DESC
LIMIT $5 OFFSET $6;`,
      userByEmailOrNickname: `SELECT u.user_id AS "userId",
               REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
               u.nickname AS "nickname",
               ua.value AS "nickEmail"
        FROM backend.users u
               LEFT JOIN backend.user_attributes ua ON u.user_id = ua.user_id AND ua.attribute_id = 7
        WHERE u.status = 1 AND u.customer_id = $1 AND
              (u.nickname LIKE $2 || '%' OR ua.value LIKE $2 || '%')
        ORDER BY u.user_id DESC
        LIMIT 10
        OFFSET 0`,
      channelUser: `SELECT DISTINCT u.user_id AS "userId",
       replace(u.username, $2, '') AS username,
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       u.created_at AS "createdAt",
       u.user_country_id AS "userCountryId",
       coalesce(u.email, '') AS email,
       c.name AS country,
       u.nickname AS nickname
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
       LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
WHERE u.status = 1 AND u.customer_id = $1 AND (u.username LIKE '%' || $4 || '%' OR u.email LIKE '%' || $4 || '%' OR u.nickname LIKE '%' || $4 || '%') AND ($3::TEXT IS  NULL OR chu.room_name=$3::TEXT)
ORDER BY u.user_id DESC
LIMIT $5 OFFSET $6;`
    },
    getUserByUsername: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       c.name AS country,
       u.email AS email,
       u.status AS status
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.username = $2;`,
    getUserByEmail: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       c.name AS country,
       u.email AS email,
       u.status AS status
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.email=$2;`,

    getUserByNickname: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       coalesce(ua3.value, '') AS "email",
       c.name AS country,
       u.nickname AS nickname,
       u.status AS status
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN backend.user_attributes ua3 ON u.user_id = ua3.user_id AND ua1.attribute_id = 7
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.nickname=$2;`,

    notVerified: {

      get: {
        all: {
          records: `SELECT ua.user_attempt_id AS "userAttemptId", replace(ua.username, $8, '') AS number,
         ua.last_attempt_at AS "attemptedAt",
         ua.region_code AS "regionCode", ua.email
  FROM backend.user_attempts ua
         LEFT JOIN backend.users u ON u.username = ua.username AND u.customer_id = $1 AND u.status=1
  WHERE u.username IS NULL AND ua.customer_id = $1 AND
        ($2::TEXT IS NULL OR ua.username = $2::TEXT) AND
        ($3::TEXT IS NULL OR ua.email = $3::TEXT) AND
        ($4::TEXT IS NULL OR ua.region_code = $4::TEXT) AND
        ($5::INT IS NULL OR ua.platform_id = $5::INT) AND
        (($6::DATE IS NULL AND $7::DATE IS NULL) OR
         (ua.last_attempt_at :: DATE BETWEEN $6 :: DATE AND $7 :: DATE))

  ORDER BY user_attempt_id DESC
  LIMIT $9 OFFSET $10;`,
          count: `SELECT count(1)
FROM backend.user_attempts ua
       LEFT JOIN backend.users u ON u.username = ua.username AND u.customer_id = $1
WHERE u.username IS NULL AND ua.customer_id = $1 AND
      ($2::TEXT IS NULL OR ua.username = $2::TEXT) AND
      ($3::TEXT IS NULL OR ua.email = $3::TEXT) AND
      ($4::TEXT IS NULL OR ua.region_code = $4::TEXT) AND
      ($5::INT IS NULL OR ua.platform_id = $5::INT) AND
      (($6::DATE IS NULL AND $7::DATE IS NULL) OR
       (ua.last_attempt_at :: DATE BETWEEN $6 :: DATE AND $7 :: DATE));`,
        }
      }
    },
    preUsers: {
      get: {
        all: {
          records: `SELECT pu.token AS "token", pu.customer_id AS "customerId", pu.email AS "email", c.name AS "countryName"
          FROM backend.pre_user pu
          LEFT JOIN internal.countries c ON c.country_id = pu.country_id
          WHERE customer_id = $1
          LIMIT $2 OFFSET $3;`,
          count: `SELECT count(1)
          FROM backend.pre_user
          WHERE customer_id = $1;`,
        }
      }
    },
    attempts: {
      get: {
        all: {
          records: `SELECT ua.user_attempt_id AS "attemptId",
       ua.region_code AS "regionCode",
       replace(ua.username, $3, '') AS number,
       ua.last_attempt_at AS "createdAt",
       ua.reset AS "reset",
       ua.email AS email
FROM backend.user_attempts ua
WHERE ua.customer_id = $1 AND ua.username = $2
ORDER BY ua.user_attempt_id DESC
LIMIT $4 OFFSET $5;`,
          count: `SELECT count(1)
FROM backend.user_attempts ua
WHERE ua.customer_id = $1 AND ua.username = $2;`,
          dailyCount: `SELECT count(1)
FROM backend.user_attempts ua
WHERE ua.customer_id = $1 AND ua.username = $2 AND ua.last_attempt_at::DATE = now()::date;`,
        }
      },
      reset: {
        daily: `UPDATE backend.user_attempts
SET reset = TRUE, updated_at = now()
WHERE username = $2 AND customer_id = $1 AND last_attempt_at > now() - INTERVAL '1 day'
      RETURNING user_attempt_id AS "userAttemptId";`,
        total: `UPDATE backend.user_attempts
SET reset = TRUE, updated_at = now()
WHERE username = $2 AND reset=FALSE AND customer_id = $1
      RETURNING user_attempt_id AS "userAttemptId";`,
      },
      count: {
        total: `SELECT count(1) FILTER ( WHERE reset = TRUE ) AS "isReseted", count(1) FILTER ( WHERE reset = false ) AS "isNotReseted"
        FROM backend.user_attempts ua
        WHERE ua.customer_id = $1 AND ua.username = $2;`,
        daily: `SELECT count(1) FILTER ( WHERE reset = TRUE ) AS "isReseted", count(1) FILTER ( WHERE reset = false ) AS "isNotReseted"
        FROM backend.user_attempts ua
        WHERE ua.customer_id = $1 AND ua.username = $2 AND ua.last_attempt_at::DATE = now()::date;`,
      }
    },
    checkUserByUsername: `SELECT u.user_id AS "userId", u.username AS "username", u.email AS "email", n.network_id AS "networkId", u.nickname AS "nickname"
FROM backend.users u
       LEFT JOIN virtual_network.network_users n ON u.user_id = n.user_id
       LEFT JOIN virtual_network.service_users su ON u.user_id = su.user_id
WHERE u.customer_id = $1 AND ($2::INT IS NULL OR n.network_id = $2::INT) AND ($3::INT IS NULL OR su.service_id = $3::INT) AND
        u.username IN (SELECT json_array_elements_text($4 :: JSON))`,
    checkChannelUserByUsername: `SELECT u.user_id AS "userId", u.username AS "username", u.email AS "email", chu.room_name AS "channelId"
FROM backend.users u
       LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
WHERE u.customer_id = $1 AND ($2::TEXT IS NULL OR chu.room_name = $2::TEXT) AND
        u.username IN (SELECT json_array_elements_text($3 :: JSON))`,
    checkUserByEmail: `SELECT u.user_id AS "userId", u.username AS "username", u.email AS "email", n.network_id AS "networkId"
FROM backend.users u
       LEFT JOIN virtual_network.network_users n ON u.user_id = n.user_id
       LEFT JOIN virtual_network.service_users su ON u.user_id = su.user_id
WHERE u.customer_id = $1 AND ($2::INT IS NULL OR n.network_id = $2::INT) AND ($3::INT IS NULL OR su.service_id = $3::INT) AND
        u.email IN (SELECT json_array_elements_text($4 :: JSON))`,
    getUserById: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       c.name AS country,
       u.email AS email
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.user_id=$2;`
  },
  channelUsers: {
    get: {
      records: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                               INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getChannels AS (
       SELECT chu.user_id, chu.room_name FROM backend.user_channels chu WHERE chu.room_name = $9::TEXT
     ),
     checkActivity AS (
       SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                     THEN TRUE
                   ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
       SELECT utm.user_id, sum(utm.value) AS "callCount"
       FROM metrics.user_timeline_metrics utm
              INNER JOIN metrics.customer_timeline ct
                         ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
             utm.metric_context_type_id = 11
       GROUP BY utm.user_id
     ),
     getMessageCounts AS (
       SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
       FROM metrics.user_timeline_metrics utm1
              INNER JOIN metrics.customer_timeline ct
                         ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
       GROUP BY utm1.user_id
     ),
     getCallDuration AS (
       SELECT utm2.user_id, sum(utm2.value) AS "duration"
       FROM metrics.user_timeline_metrics utm2
              INNER JOIN metrics.customer_timeline ct
                         ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
       GROUP BY utm2.user_id
     )
SELECT u.user_id AS "userId",
       replace(u.username, $16::TEXT, '') AS number,
       u.email,
       u.nickname,
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       ca.sort_name AS "regionCode",
       ca.name AS "countryName"
FROM backend.users u
       INNER JOIN getChannels chan ON u.user_id = chan.user_id
       LEFT JOIN internal.countries ca ON u.user_country_id = ca.country_id
       LEFT JOIN backend.user_attributes ua1
                 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
       LEFT JOIN getUserDevices ud
                 ON u.user_id = ud.user_id

       LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
       LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
       LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::TEXT IS NULL OR ($9::TEXT IS NOT NULL AND chan.room_name = $9::TEXT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT))
ORDER BY u.user_id DESC
LIMIT $17
  OFFSET $18`,
      count: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                               INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getChannels AS (
       SELECT chu.user_id, chu.room_name FROM backend.user_channels chu WHERE chu.room_name = $9::TEXT
     ),
     checkActivity AS (
       SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                     THEN TRUE
                   ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
       SELECT utm.user_id, sum(utm.value) AS "callCount"
       FROM metrics.user_timeline_metrics utm
              INNER JOIN metrics.customer_timeline ct
                         ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
             utm.metric_context_type_id = 11
       GROUP BY utm.user_id
     ),
     getMessageCounts AS (
       SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
       FROM metrics.user_timeline_metrics utm1
              INNER JOIN metrics.customer_timeline ct
                         ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
       GROUP BY utm1.user_id
     ),
     getCallDuration AS (
       SELECT utm2.user_id, sum(utm2.value) AS "duration"
       FROM metrics.user_timeline_metrics utm2
              INNER JOIN metrics.customer_timeline ct
                         ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
       GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
       INNER JOIN getChannels chan ON u.user_id = chan.user_id
       LEFT JOIN getUserDevices ud
                 ON u.user_id = ud.user_id

       LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
       LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
       LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::TEXT IS NULL OR ($9::TEXT IS NOT NULL AND chan.room_name = $9::TEXT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT))`
    },
  },
  networkUsers: {
    get: {
      records: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                               INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
       SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
       SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                     THEN TRUE
                   ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
       SELECT utm.user_id, sum(utm.value) AS "callCount"
       FROM metrics.network_user_timeline_metrics utm
              INNER JOIN metrics.customer_timeline ct
                         ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
             utm.metric_context_type_id = 11
       GROUP BY utm.user_id
     ),
     getMessageCounts AS (
       SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
       FROM metrics.network_user_timeline_metrics utm1
              INNER JOIN metrics.customer_timeline ct
                         ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
       GROUP BY utm1.user_id
     ),
     getCallDuration AS (
       SELECT utm2.user_id, sum(utm2.value) AS "duration"
       FROM metrics.network_user_timeline_metrics utm2
              INNER JOIN metrics.customer_timeline ct
                         ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
       GROUP BY utm2.user_id
     )
SELECT u.user_id AS "userId",
       replace(u.username, $16::TEXT, '') AS number,
       u.email,
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       ca.sort_name AS "regionCode",
       ca.name AS "countryName"
FROM backend.users u
       INNER JOIN getNetworks n ON u.user_id = n.user_id
       LEFT JOIN internal.countries ca ON u.user_country_id = ca.country_id
       LEFT JOIN backend.user_attributes ua1
                 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
       LEFT JOIN getUserDevices ud
                 ON u.user_id = ud.user_id

       LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
       LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
       LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT))
ORDER BY u.user_id DESC
LIMIT $17
  OFFSET $18;`,
      count: `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                               INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id),
     getNetworks AS (
       SELECT nu.user_id, nu.network_id FROM virtual_network.network_users nu WHERE nu.network_id = $9::INT
     ),
     checkActivity AS (
       SELECT CASE WHEN $4::DATE IS NOT NULL AND $5::DATE IS NOT NULL
                     THEN TRUE
                   ELSE FALSE END AS enabled
     ),
     getCallCounts AS (
       SELECT utm.user_id, sum(utm.value) AS "callCount"
       FROM metrics.network_user_timeline_metrics utm
              INNER JOIN metrics.customer_timeline ct
                         ON utm.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND utm.metric_type_id = 2 AND
             utm.metric_context_type_id = 11
       GROUP BY utm.user_id
     ),
     getMessageCounts AS (
       SELECT utm1.user_id, sum(utm1.value) AS "messageCount"
       FROM metrics.network_user_timeline_metrics utm1
              INNER JOIN metrics.customer_timeline ct
                         ON utm1.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND utm1.metric_type_id = 1
       GROUP BY utm1.user_id
     ),
     getCallDuration AS (
       SELECT utm2.user_id, sum(utm2.value) AS "duration"
       FROM metrics.network_user_timeline_metrics utm2
              INNER JOIN metrics.customer_timeline ct
                         ON utm2.customer_timeline_id = ct.customer_timeline_id AND ct.customer_id = $1::INT
       WHERE ($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND utm2.metric_type_id = 7
       GROUP BY utm2.user_id
     )
SELECT count(u.user_id) AS "count"
FROM backend.users u
       INNER JOIN getNetworks n ON u.user_id = n.user_id
       LEFT JOIN getUserDevices ud
                 ON u.user_id = ud.user_id

       LEFT JOIN getCallCounts cc ON u.user_id = cc.user_id
       LEFT JOIN getMessageCounts mc ON u.user_id = mc.user_id
       LEFT JOIN getCallDuration cd ON u.user_id = cd.user_id

WHERE u.status = 1 AND u.customer_id = $1::INT AND
      (($2::DATE IS NULL AND $3::DATE IS NULL) OR
       ($2::DATE IS NOT NULL AND $3::DATE IS NOT NULL AND
        u.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE)) AND
      ($6::INT IS NULL OR ($6::INT IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($9::INT IS NULL OR ($9::INT IS NOT NULL AND n.network_id = $9::INT)) AND
      ($8::INT IS NULL OR ($8 IS NOT NULL AND u.user_id = $8::INT)) AND
      (($10::INT IS NULL AND $11::INT IS NULL) OR
       (($10::INT IS NOT NULL AND $11::INT IS NOT NULL) AND cc."callCount" BETWEEN $10::INT AND $11::INT)) AND
      (($12::INT IS NULL AND $13::INT IS NULL) OR
       (($12::INT IS NOT NULL AND $13::INT IS NOT NULL) AND mc."messageCount" BETWEEN $12::INT AND $13::INT)) AND
      (($14::INT IS NULL AND $15::INT IS NULL) OR
       (($14::INT IS NOT NULL AND $15::INT IS NOT NULL) AND cd."duration" BETWEEN $14::INT AND $15::INT));`,
    },
    create: `INSERT INTO backend.users(customer_id, username, password, created_at, updated_at, user_country_id,
                          status, email)
VALUES ($1::INT, $2::TEXT, crypt($3::TEXT, gen_salt('bf', 8)), NOW(), NOW(),
        (SELECT ca.country_id FROM internal.countries ca WHERE ca.sort_name = $4::TEXT), 1,
        $5::TEXT) RETURNING user_id AS "userId";`,
    createCache: `SELECT u.user_id AS "userId",
       u.username AS "username",
       json_build_object(
           'customerId', ca.customer_id,
           'prefix', ca.prefix,
           'name', ca.name,
           'currency', ca.currency,
           'businessNumber', ca.customer_business_number,
           'multiDevice', coalesce(cat.value::BOOLEAN, FALSE)
         ) AS customer,
       json_build_object(
           'countryId', cn.country_id,
           'regionCode', cn.sort_name,
           'sortName', cn.sort_name,
           'name', cn.name,
           'phoneCode', cn.phone_code
         ) AS country
FROM backend.users u
       INNER JOIN customer.customers ca ON u.customer_id = ca.customer_id
       LEFT JOIN customer.customer_attributes cat ON ca.customer_id = cat.customer_id
       LEFT JOIN internal.countries cn ON u.user_country_id = cn.country_id
WHERE u.user_id = $1;`,
    getUsers: 'SELECT u.user_id,\n' +
      '       replace(username, $2, \'\') AS username,\n' +
      '       u.user_country_id,\n' +
      '       u.created_at,\n' +
      '       coalesce(ua1.value, \'\') AS first_name,\n' +
      '       coalesce(ua2.value, \'\') AS last_name,\n' +
      '       c.name AS country,\n' +
      '       u.email,\n' +
      '       u.user_id AS "userId",\n' +
      '       u.created_at AS "createdAt",\n' +
      '       u.user_country_id AS "countryId",\n' +
      '       coalesce(ua1.value, \'\') AS "firstName",\n' +
      '       coalesce(ua2.value, \'\') AS lastName\n' +
      'FROM backend.users u\n' +
      '       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.status = 1 AND u.customer_id = $1 AND u.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE\n' +
      'ORDER BY u.created_at DESC\n' +
      'LIMIT $5\n' +
      'OFFSET $6;',
    searchUser: 'SELECT\n' +
      '  u.user_id,\n' +
      '  u.user_country_id,\n' +
      '  u.created_at,\n' +
      '  coalesce(ua1.value, \'\') AS first_name,\n' +
      '  coalesce(ua2.value, \'\') AS last_name,\n' +
      '\n' +
      '  replace(u.username, $2, \'\') AS username,\n' +
      '  coalesce(ua1.value, \'\') AS "firstName",\n' +
      '  coalesce(ua2.value, \'\') AS "lastName",\n' +
      '  u.created_at AS "createdAt",\n' +
      '  u.user_country_id AS  "userCountryId",\n' +
      '  u.user_id AS "userId",\n' +
      '  coalesce(u.email, \'\') AS email,\n' +
      '  c.name AS country\n' +
      'FROM backend.users u\n' +
      '  LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '  LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '  LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.status = 1 AND u.customer_id = $1 AND ( u.username LIKE \'%\'||$3||\'%\' OR u.email LIKE \'%\'||$3||\'%\') ORDER BY u.user_id LIMIT $4 OFFSET $5;\n',
    killUser: 'DELETE FROM backend.users WHERE customer_id=$1 AND user_id=$2;',
    getUser: 'SELECT u.user_id AS "userId",\n' +
      '       u.username,\n' +
      '       u.user_country_id AS "countryId",\n' +
      '       u.customer_id AS "customerId",\n' +
      '       u.created_at AS "createdAt",\n' +
      '       coalesce(ua1.value, \'\') AS "firstName",\n' +
      '       coalesce(ua2.value, \'\') AS "lastName",\n' +
      '       c.name AS country,\n' +
      '       u.email AS email\n' +
      'FROM backend.users u\n' +
      '       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2\n' +
      '       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3\n' +
      '       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id\n' +
      'WHERE u.customer_id = $1 AND u.user_id = $2;',
    search: {
      user: `SELECT u.user_id AS "userId",
       replace(u.username, $2, '') AS username,
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       u.created_at AS "createdAt",
       u.user_country_id AS "userCountryId",
       coalesce(u.email, '') AS email,
       c.name AS country
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
       LEFT JOIN virtual_network.network_users nu ON u.user_id = nu.user_id
WHERE u.status = 1 AND u.customer_id = $1 AND (u.username LIKE '%' || $4 || '%' OR u.email LIKE '%' || $4 || '%') AND ($3::INT IS  NULL OR nu.network_id=$3::INT)
ORDER BY u.user_id DESC
LIMIT $5 OFFSET $6;`
    },
    getUserByUsername: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       c.name AS country,
       u.email AS email,
       u.status AS status
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.username = $2 AND (u.status=0 OR u.status=1);`,
    getUserByEmail: `SELECT u.user_id AS "userId",
       u.username,
       u.user_country_id AS "countryId",
       u.customer_id AS "customerId",
       u.created_at AS "createdAt",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       c.name AS country,
       u.email AS email,
       u.status AS status
FROM backend.users u
       LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua1.attribute_id = 3
       LEFT JOIN internal.countries c ON u.user_country_id = c.country_id
WHERE u.customer_id = $1 AND u.email=$2 AND (u.status=0 OR u.status=1);`,
    notVerified: {

      get: {
        all: {
          records: `SELECT ua.user_attempt_id AS "userAttemptId", replace(ua.username, $8, '') AS number,
         ua.last_attempt_at AS "attemptedAt",
         ua.region_code AS "regionCode", ua.email
  FROM backend.user_attempts ua
         LEFT JOIN backend.users u ON u.username = ua.username AND u.customer_id = $1
  WHERE u.username IS NULL AND ua.customer_id = $1 AND
        ($2::TEXT IS NULL OR ua.username = $2::TEXT) AND
        ($3::TEXT IS NULL OR ua.email = $3::TEXT) AND
        ($4::TEXT IS NULL OR ua.region_code = $4::TEXT) AND
        ($5::INT IS NULL OR ua.platform_id = $5::INT) AND
        (($6::DATE IS NULL AND $7::DATE IS NULL) OR
         (ua.last_attempt_at :: DATE BETWEEN $6 :: DATE AND $7 :: DATE))

  ORDER BY user_attempt_id DESC
  LIMIT $9 OFFSET $10;`,
          count: `SELECT count(1)
FROM backend.user_attempts ua
       LEFT JOIN backend.users u ON u.username = ua.username AND u.customer_id = $1
WHERE u.username IS NULL AND ua.customer_id = $1 AND
      ($2::TEXT IS NULL OR ua.username = $2::TEXT) AND
      ($3::TEXT IS NULL OR ua.email = $3::TEXT) AND
      ($4::TEXT IS NULL OR ua.region_code = $4::TEXT) AND
      ($5::INT IS NULL OR ua.platform_id = $5::INT) AND
      (($6::DATE IS NULL AND $7::DATE IS NULL) OR
       (ua.last_attempt_at :: DATE BETWEEN $6 :: DATE AND $7 :: DATE));`,
        }
      }
    },
    attempts: {
      get: {
        all: {
          records: `SELECT ua.user_attempt_id AS "attemptId",
       ua.region_code AS "regionCode",
       replace(ua.username, $3, '') AS number,
       ua.last_attempt_at AS "createdAt",
       ua.reset AS "reset",
       ua.email AS email
FROM backend.user_attempts ua
WHERE ua.customer_id = $1 AND ua.username = $2
ORDER BY ua.user_attempt_id DESC
LIMIT $4 OFFSET $5;`,
          count: `SELECT count(1)
FROM backend.user_attempts ua
WHERE ua.customer_id = $1 AND ua.username = $2;`,
        }
      },
      reset: {
        daily: `UPDATE backend.user_attempts
SET reset = TRUE, updated_at = now()
WHERE username = $2 AND customer_id = $1 AND last_attempt_at > now() - INTERVAL '1 day'
      RETURNING user_attempt_id AS "userAttemptId";`,
        total: `UPDATE backend.user_attempts
SET reset = TRUE, updated_at = now()
WHERE username = $2 AND reset=FALSE AND customer_id = $1
      RETURNING user_attempt_id AS "userAttemptId";`,
      }
    },
    checkUserByUsername: `SELECT u.user_id AS "userId", u.username AS "username", n.network_id AS "networkId"
FROM backend.users u
       LEFT JOIN virtual_network.network_users n ON u.user_id = n.user_id
WHERE u.customer_id = $1 AND ($2::INT IS NULL OR n.network_id = $2::INT) AND
        u.username IN (SELECT json_array_elements_text($3 :: JSON))`
  },
  metrics: {
    getMetricValues: {
      records: 'SELECT ct.created_at AS "createdAt",\n' +
        '       mt.name AS "metricType",\n' +
        '       mct.name AS "metricContextType",\n' +
        '       tc.region_code AS "regionCode",\n' +
        '       tm.value AS "value",\n' +
        '       tm.metric_context_type_id AS "metricContextTypeId",\n' +
        '       tm.metric_type_id AS "metricTypeId"\n' +
        'FROM metrics.timeline_metrics tm\n' +
        '       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id\n' +
        '       INNER JOIN metrics.metric_types mt ON tm.metric_type_id = mt.metric_type_id\n' +
        '       INNER JOIN metrics.metric_context_types mct ON tm.metric_context_type_id = mct.metric_context_type_id\n' +
        '       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id\n' +
        'WHERE ct.customer_id = $1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND\n' +
        '        tc.region_code = $4 AND tm.metric_type_id = $5 AND tm.metric_context_type_id = $6\n' +
        'ORDER BY ct.created_at DESC LIMIT $7 OFFSET $8;',
      count: 'SELECT count(ct.customer_timeline_id) AS count\n' +
        'FROM metrics.timeline_metrics tm\n' +
        '       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id\n' +
        '       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id\n' +
        'WHERE ct.customer_id=$1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND tc.region_code = $4 AND\n' +
        '        tm.metric_type_id = $5 AND tm.metric_context_type_id = $6;',
    },
    countries: {
      values: `SELECT tc.region_code AS "regionCode",
       tc.timeline_country_id AS "regionId",
       coalesce(sum(tm.value) FILTER (WHERE ($3::BIGINT IS NULL  OR tm.metric_context_type_id=$3::BIGINT )), 0) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND tm.metric_type_id = $2 AND
        ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
GROUP BY tc.timeline_country_id, tm.metric_type_id
ORDER BY "value" DESC;`,
      value: 'SELECT mct.name AS "metricContextType",\n' +
        '       sum(tm.value) AS "value"\n' +
        'FROM metrics.timeline_metrics tm\n' +
        '       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id\n' +
        '       INNER JOIN metrics.metric_context_types mct ON tm.metric_context_type_id = mct.metric_context_type_id\n' +
        'WHERE ct.customer_id = $1 AND tm.metric_type_id = $3 AND tm.timeline_country_id = $2 AND\n' +
        '        ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE\n' +
        'GROUP BY tm.timeline_country_id, tm.metric_type_id, mct.metric_context_type_id\n' +
        'ORDER BY "value" DESC;',
      chartValues: `SELECT ct.created_at AS "createdAt",
       coalesce(sum(tm.value) FILTER (WHERE ($3 :: BIGINT IS NULL OR tm.metric_context_type_id = $3 :: BIGINT)),
                0) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND tm.metric_type_id = $2 AND ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
GROUP BY ct.created_at, tm.metric_type_id
ORDER BY "value" DESC;`,
    }
  },
  systemMessages: {
    channelUsers: {
      records: `SELECT DISTINCT (u.user_id) AS "userId", u.username AS "username"
FROM backend.user_devices ud
         INNER JOIN backend.users u ON ud.user_id = u.user_id
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
WHERE u.customer_id = $1 AND u.status = 1 AND ($5::TEXT IS NULL OR chu.room_name = $5::TEXT) AND
      ud.platform_id IN (SELECT "pIds" :: INT FROM json_array_elements_text($2 :: JSON) "pIds") AND
      u.user_country_id IN (SELECT "cIds" :: INT FROM json_array_elements_text($3 :: JSON) "cIds") AND
      (u.username LIKE $4 || '%' OR u.nickname LIKE $4 || '%')`,
      count: `SELECT count(DISTINCT u.user_id) AS count
FROM backend.user_devices ud
         INNER JOIN backend.users u ON ud.user_id = u.user_id
         LEFT JOIN backend.user_channels chu ON u.user_id = chu.user_id
WHERE u.customer_id = $1 AND u.status = 1 AND ($5::TEXT IS NULL OR chu.room_name = $5::TEXT) AND
      ud.platform_id IN (SELECT "pIds" :: INT FROM json_array_elements_text($2 :: JSON) "pIds") AND
      u.user_country_id IN (SELECT "cIds" :: INT FROM json_array_elements_text($3 :: JSON) "cIds") AND
      (u.username LIKE $4 || '%' OR u.nickname LIKE $4 || '%')`
    },
    users: {
      records: `SELECT DISTINCT (u.user_id) AS "userId", u.username AS "username"
FROM backend.user_devices ud
         INNER JOIN backend.users u ON ud.user_id = u.user_id
         LEFT JOIN virtual_network.network_users n ON u.user_id = n.user_id
         LEFT JOIN virtual_network.service_users su ON u.user_id = su.user_id
WHERE u.customer_id = $1 AND u.status = 1 AND ($5::INT IS NULL OR n.network_id = $5::INT) AND
      ($6::INT IS NULL OR su.service_id = $6::INT) AND
      ud.platform_id IN (SELECT "pIds" :: INT FROM json_array_elements_text($2 :: JSON) "pIds") AND
      u.user_country_id IN (SELECT "cIds" :: INT FROM json_array_elements_text($3 :: JSON) "cIds") AND
      u.username LIKE $4 || '%' AND
      ($7 :: TEXT IS NULL OR u.nickname LIKE $7 :: TEXT || '%');`,
      count: `SELECT count(DISTINCT u.user_id) AS count
FROM backend.user_devices ud
         INNER JOIN backend.users u ON ud.user_id = u.user_id
         LEFT JOIN virtual_network.network_users n ON u.user_id = n.user_id
         LEFT JOIN virtual_network.service_users su ON u.user_id = su.user_id
WHERE u.customer_id = $1 AND u.status = 1 AND ($5::INT IS NULL OR n.network_id = $5::INT) AND
      ($6::INT IS NULL OR su.service_id = $6::INT) AND
      ud.platform_id IN (SELECT "pIds" :: INT FROM json_array_elements_text($2 :: JSON) "pIds") AND
      u.user_country_id IN (SELECT "cIds" :: INT FROM json_array_elements_text($3 :: JSON) "cIds") AND
      u.username LIKE $4 || '%' AND
      ($7 :: TEXT IS NULL OR u.nickname LIKE $7 :: TEXT || '%');`
    },
    senders: {
      list: {
        senders: `SELECT ms.message_sender_id AS "messageSenderId",
       ms.label, number,
       ms.created_at AS "createdAt",
       ms.is_verified AS "isVerified"
FROM notification.message_senders ms
         LEFT JOIN (SELECT sms.service_message_sender_id, s.service_id, n.network_id, sms.message_sender_id
                    FROM virtual_network.service_message_senders sms
                             INNER JOIN virtual_network.services s ON sms.service_id = s.service_id
                             INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
                             INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
                    WHERE n.status_id = 1 AND s.service_status_id = 1
) sms ON ms.message_sender_id = sms.message_sender_id
WHERE ms.customer_id = $1 AND MS.active = TRUE AND ($2::INT IS NULL OR sms.network_id = $2::INT) AND
      ($3::INT IS NULL OR sms.service_id = $3::INT)
ORDER BY ms.message_sender_id DESC
LIMIT $4
OFFSET $5;`,
        images: `SELECT msi.message_sender_image_id AS "messageSenderImageId", msi.filename, msi.key, msi.bucket
FROM notification.message_sender_images msi
         INNER JOIN notification.message_senders ms ON msi.message_sender_id = ms.message_sender_id
WHERE ms.active = TRUE AND ms.customer_id = $1 AND ms.message_sender_id = $2;`
      },
      retrieve: {
        sender: `SELECT ms.message_sender_id AS "messageSenderId",
       ms.label, number,
       ms.created_at AS "createdAt",
       ms.is_verified AS "isVerified",
       (SELECT CASE WHEN msi.message_sender_image_id IS NOT NULL
                        THEN json_build_object(
                   'messageSenderImageId', msi.message_sender_id,
                   'filename', msi.filename,
                   'key', msi.key,
                   'bucket', msi.bucket
               )
                    ELSE NULL END) AS image
FROM notification.message_senders ms
       LEFT JOIN notification.message_sender_images msi ON ms.message_sender_id = msi.message_sender_id
WHERE ms.customer_id = $1 AND ms.active = TRUE AND ms.message_sender_id = $2
GROUP BY ms.message_sender_id, msi.message_sender_image_id;`
      },
      count: {
        senders: `SELECT cast(count(1) AS INT) AS count
FROM notification.message_senders
WHERE customer_id = $1 AND active = TRUE;`
      },
      create: {
        sender: `INSERT INTO notification.message_senders (customer_id, label, number, is_verified)
VALUES ($1, $2, $3, $4) RETURNING message_sender_id AS "messageSenderId", created_at AS "createdAt";`
      },
      update: {
        sender: `UPDATE notification.message_senders
SET label=$3, number=$4, is_verified=$5, updated_at=NOW()
WHERE customer_id = $1 AND message_sender_id = $2 RETURNING updated_at AS "updatedAt";`,
        image: `INSERT INTO notification.message_sender_images (message_sender_id, filename, key, bucket)
VALUES ($1, $2, $3, $4)
ON CONFLICT (message_sender_id) DO UPDATE SET filename=$2, key=$3, bucket=$4 RETURNING filename, key, bucket;`
      },
      delete: {
        sender: `DELETE FROM notification.message_senders
WHERE customer_id = $1 AND message_sender_id = $2;`,
        senderImage: `DELETE FROM notification.message_sender_images
WHERE message_sender_id = $1;`,
      }

    }
  },
  devices: {
    get: {
      notSpecified: {
        platforms: `SELECT DISTINCT u.user_id AS "userId",
                u.username AS "username",
                ud.device_access_token AS "accessToken"
FROM backend.user_devices ud
       INNER JOIN backend.users u ON ud.user_id = u.user_id
WHERE u.customer_id = $1 AND ud.platform_id = 5;`
      }
    },
    migrate: {
      notSpecified: {
        platforms: `UPDATE backend.user_devices AS ud
SET platform_id = d2."platformId"
FROM (SELECT (d->>'userId')::INT AS "userId",
             (d->>'platformId')::INT AS "platformId",
             (d->>'accessToken') AS "accessToken"
      FROM json_array_elements($1::JSON) d) AS d2
WHERE d2."userId" = ud.user_id AND d2."accessToken" = ud.device_access_token
    RETURNING ud.platform_id AS "platformId", ud.user_id AS "userId", ud.user_device_id AS "userDeviceId";`
      }
    }
  },
  chatBot: {
    get: {
      all: {
        chatBots: {
          records: `SELECT chatbot_id AS "chatBotId",
       nickname AS "nickname",
       name AS "name",
       description AS "description",
       created_at AS "createdAt",
       updated_at AS "updatedAt",
       avatar::JSONB AS "avatar"
FROM bot.chatbots
WHERE customer_id=$1 AND chatbot_status_id !=2
ORDER BY "chatBotId" DESC
LIMIT $2
OFFSET $3;`,
          count: `SELECT count(1) AS count
FROM bot.chatbots
WHERE customer_id=$1 AND chatbot_status_id !=2`
        },
        chatBotCredentials: {
          records: `SELECT cc.chatbot_credential_id AS "chatBotCredentialId",
       cc.access_key AS "accessKey",
       cc.secret AS "secret",
       cc.created_at AS "createdAt"

FROM bot.chatbot_credentials cc
       INNER JOIN bot.chatbots cb ON cc.chatbot_id = cb.chatbot_id
WHERE cb.customer_id = $1 AND cc.chatbot_id = $2
ORDER BY cc.chatbot_credential_id
LIMIT $3
OFFSET $4;`,
          count: `SELECT count(cc.chatbot_credential_id) AS count
FROM bot.chatbot_credentials cc
       LEFT JOIN bot.chatbots cb ON cc.chatbot_id = cb.chatbot_id AND cb.customer_id = $1
WHERE cc.chatbot_id = $2`
        }
      },
      one: {
        chatBot: `SELECT chatbot_id AS "chatBotId",
       nickname AS "nickname",
       name AS "name",
       description AS "description",
       created_at AS "createdAt",
       updated_at AS "updatedAt",
       avatar::JSONB AS "avatar"
FROM bot.chatbots
WHERE customer_id=$1 AND chatbot_status_id !=2 AND chatbot_id=$2;`
      }
    },
    create: {
      chatBot: `
INSERT INTO bot.chatbots(customer_id, chatbot_status_id, nickname, name, description, updated_at)
VALUES ($1, 1, $2, $3, $4, NOW())
    RETURNING chatbot_id AS "chatBotId",
      nickname AS "nickname",
      name AS "name",
      description AS "description",
      created_at AS "createdAt",
      updated_at AS "updatedAt";`,
      chatBotCredential: `INSERT INTO bot.chatbot_credentials(access_key, secret, created_at, chatbot_id)
SELECT uuid_generate_v4(),
       md5(now() :: TEXT),
       NOW(),
       cb.chatbot_id
FROM bot.chatbots cb
WHERE cb.customer_id = $1 AND cb.chatbot_id = $2
    RETURNING chatbot_credential_id AS "chatBotCredentialId",
      access_key AS "accessKey",
      secret AS "secret",
      created_at AS "createdAt";`
    },
    delete: {
      chatBot: `UPDATE bot.chatbots
SET chatbot_status_id = 2, updated_at = now()
WHERE chatbot_id = $2 AND customer_id = $1 RETURNING chatbot_status_id AS "chatbotStatusId", updated_at AS "updatedAt";
`,
      chatBotCredential: `DELETE
FROM bot.chatbot_credentials
WHERE chatbot_credential_id = (SELECT cc.chatbot_credential_id
                               FROM bot.chatbot_credentials cc
                                      INNER JOIN bot.chatbots cb ON cc.chatbot_id = cb.chatbot_id
                               WHERE cb.customer_id = $1 AND cb.chatbot_id = $2 AND cc.chatbot_credential_id = $3)`
    },
    update: {
      chatBot: `UPDATE bot.chatbots
SET name = $3, description = $4, updated_at = now(), avatar=$5
WHERE chatbot_id = $2 AND customer_id = $1
    RETURNING chatbot_status_id AS "chatbotStatusId",
      updated_at AS "updatedAt",
      name AS "name",
      description AS "description";`,
      chatBotAvatar: `WITH "getUUIDv4" AS (SELECT uuid_generate_v4() AS "UUID")
UPDATE bot.chatbots
SET avatar = json_build_object(
               'bucket', $3 :: TEXT,
               'key', $4 :: TEXT || '/' || (SELECT "UUID"
                                            FROM "getUUIDv4"),
               'filename', (SELECT "UUID"
                            FROM "getUUIDv4")), updated_at = NOW()
WHERE chatbot_id = $2 AND customer_id = $1
    RETURNING
      chatbot_id AS "chatBotId",
      updated_at AS "updatedAt",
      avatar AS "avatar";`
    }

  },
  presence: {
    create: 'SELECT backend."createUserPresenceInstants"($1, $2, $3, $4, $5, $6) AS "presence";'
  },
  channels: {
    modules: {
      authentication: {
        signIn: `SELECT a."administrator_id" AS "administratorId",
       a.customer_id AS "customerId",
       a.email AS "email",
       cha.room_name As "roomName",
       json_build_object(
           'customerId', ca.customer_id,
           'name', ca.name,
           'prefix', ca.prefix,
           'currency', ca.currency,
           'internalCurrency', ca.internal_currency,
           'customerBusinessNumber', ca.customer_business_number
         ) AS customer,
       json_agg(
           json_build_object('attributeId', at.attribute_id, 'attributeName', at.name, 'value', aa.value)) AS attributes
FROM dashboard."administrators" a
       INNER JOIN customer."customers" ca ON ca."customer_id" = a."customer_id"
       INNER JOIN dashboard.channel_admins cha ON a.administrator_id = cha.admin_id

       LEFT JOIN core.attributes at ON at.attribute_id IN (2, 3, 4, 8)
       LEFT JOIN dashboard.administrator_attributes aa
                 ON aa.attribute_id = at.attribute_id AND aa.administrator_id = a.administrator_id
WHERE a."email" = $1 AND a.password = crypt($2, a.password) AND a."status" = 1 AND
      ca.customer_status = 1 AND ca.active = TRUE
GROUP BY a.administrator_id, ca.customer_id, cha.room_name`,
        requestResetPassword: `UPDATE dashboard.administrators AS a
SET recovery_token = uuid_generate_v4(), recovery_sent_at = now()
FROM dashboard.administrators AS a2
       INNER JOIN dashboard.channel_admins cha ON a2.administrator_id = cha.admin_id
       INNER JOIN customer.customers ca ON a2.customer_id = ca.customer_id
WHERE a.email = $1
      RETURNING a.email AS "email", a.recovery_token AS "recoveryToken", a.recovery_sent_at AS "recoverySentAt", ca.prefix AS "prefix"`,
        validateRecoveryToken: `SELECT a.recovery_sent_at + INTERVAL '4 hours' AS "recoveryTokenSentAt",
       a.recovery_token AS "recoveryToken",
       c.prefix
FROM dashboard.administrators a
       INNER JOIN customer.customers c ON a.customer_id = c.customer_id
       INNER JOIN dashboard.channel_admins cha ON a.administrator_id = cha.admin_id
WHERE a.recovery_token = $1 AND
      a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours'`,
        resetPassword: `UPDATE dashboard.administrators AS a
SET password         = crypt($2, gen_salt('bf', 8)),
    recovery_token   = NULL,
    updated_at       = now(),
    recovery_sent_at = NULL
FROM dashboard.administrators AS a2
       INNER JOIN customer.customers c ON a2.customer_id = c.customer_id
WHERE a.recovery_token = $1 AND a.status = 1 AND a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours' AND
      c.active = TRUE
      RETURNING a.updated_at + INTERVAL '4 hours' AS "updatedAt"`
      },
    },
    get: {
      all: {
        channelUsers: {
          records: `SELECT chu.username AS username
                    FROM backend.user_channels chu
                    WHERE chu.room_name=$1`,
        },
        channelInfo: {
          records: `SELECT replace(u.username, $2::TEXT, '') AS number,
                           u.email AS email,
                           coalesce(ua1.value, '') AS "firstName",
                           coalesce(ua2.value, '') AS "lastName"
                    FROM backend.users u
                           LEFT JOIN backend.user_attributes ua1
                                     ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
                           LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
                    WHERE u.username IN (SELECT * FROM UNNEST ($1::text[]))`,
          channels: `SELECT DISTINCT chu.subject AS "subject",
                chu.room_name AS "roomName"
                    FROM backend.user_channels chu
                    WHERE chu.room_name IN
                    (SELECT * FROM UNNEST ($1::text[]))`,
        },
      },
    },
  },
  networks: {
    modules: {
      authentication: {
        signIn: `SELECT a."administrator_id" AS "administratorId",
       a.customer_id AS "customerId",
       a.email AS "email",
       json_build_object(
           'customerId', ca.customer_id,
           'name', ca.name,
           'prefix', ca.prefix,
           'currency', ca.currency,
           'internalCurrency', ca.internal_currency,
           'customerBusinessNumber', ca.customer_business_number
         ) AS customer,
       json_build_object(
           'networkId', n.network_id,
           'nickname', n.nickname,
           'statusId', n.status_id,
           'trial', CASE WHEN ntp IS NOT NULL
                           THEN json_build_object('startedAt', ntp.started_at, 'endedAt', ntp.ended_at)
                         ELSE NULL END,
           'subscription', CASE WHEN s IS NOT NULL
                                  THEN json_build_object('subscriptionId', s.subscription_id)
                                ELSE NULL END
         ) AS network,
       json_agg(
           json_build_object('attributeId', at.attribute_id, 'attributeName', at.name, 'value', aa.value)) AS attributes
FROM dashboard."administrators" a
       INNER JOIN customer."customers" ca ON ca."customer_id" = a."customer_id"
       INNER JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
       INNER JOIN virtual_network.networks n ON na.network_id = n.network_id

       LEFT JOIN virtual_network.network_trial_periods ntp ON n.network_id = ntp.network_id AND ntp.active=TRUE
       LEFT JOIN payment.subscriptions s ON n.network_id = s.network_id

       LEFT JOIN core.attributes at ON at.attribute_id IN (2, 3, 4, 8)
       LEFT JOIN dashboard.administrator_attributes aa
                 ON aa.attribute_id = at.attribute_id AND aa.administrator_id = a.administrator_id
WHERE a."email" = $1 AND a.password = crypt($2, a.password) AND a."status" = 1 AND
      ca.customer_status = 1 AND ca.active = TRUE AND n.active = TRUE
GROUP BY a.administrator_id, ca.customer_id, n.network_id, ntp.network_trial_period_id, s.subscription_id;`,
        requestResetPassword: `UPDATE dashboard.administrators AS a
SET recovery_token = uuid_generate_v4(), recovery_sent_at = now()
FROM dashboard.administrators AS a2
       INNER JOIN virtual_network.network_admins na ON a2.administrator_id = na.admin_id
       INNER JOIN virtual_network.networks n ON na.network_id = n.network_id
       INNER JOIN customer.customers ca ON a2.customer_id = ca.customer_id
WHERE a.email = $1 AND n.active = TRUE
      RETURNING a.email AS "email", a.recovery_token AS "recoveryToken", a.recovery_sent_at AS "recoverySentAt", ca.prefix AS "prefix";`,
        validateRecoveryToken: `SELECT a.recovery_sent_at + INTERVAL '4 hours' AS "recoveryTokenSentAt",
       a.recovery_token AS "recoveryToken",
       c.prefix
FROM dashboard.administrators a
       INNER JOIN customer.customers c ON a.customer_id = c.customer_id
       INNER JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
       INNER JOIN virtual_network.networks n ON na.network_id = n.network_id
WHERE a.recovery_token = $1 AND
      a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours';`,
        resetPassword: `UPDATE dashboard.administrators AS a
SET password         = crypt($2, gen_salt('bf', 8)),
    recovery_token   = NULL,
    updated_at       = now(),
    recovery_sent_at = NULL
FROM dashboard.administrators AS a2
       INNER JOIN customer.customers c ON a2.customer_id = c.customer_id
WHERE a.recovery_token = $1 AND a.status = 1 AND a."recovery_sent_at" > now() - INTERVAL '1 day 4 hours' AND
      c.active = TRUE
      RETURNING a.updated_at + INTERVAL '4 hours' AS "updatedAt";`,
      },
      invites: {
        get: {
          all: {
            records: `SELECT ni.network_invite_id AS "networkInviteId",
       ni.network_invite_id AS "networkId",
       ni.invitee AS "invitee",
       ni.created_at AS "createdAt",
       ni.updated_at AS "updatedAt",
       ni.token AS "token",
       ni.invitor_id AS "invitorId",
       a.email AS "invitor"
FROM virtual_network.network_invites ni
       INNER JOIN virtual_network.networks n ON ni.network_id = n.network_id
       INNER JOIN dashboard.administrators a ON ni.invitor_id = a.administrator_id
WHERE ni.network_id = $2 AND n.customer_id=$1
LIMIT $3
OFFSET $4;`,
            count: `SELECT count(1) AS count
FROM virtual_network.network_invites ni
       INNER JOIN virtual_network.networks n ON ni.network_id = n.network_id
       INNER JOIN dashboard.administrators a ON ni.invitor_id = a.administrator_id
WHERE ni.network_id = $2 AND n.customer_id=$1;`
          }
        },
        create: `INSERT INTO virtual_network.network_invites(network_id,
                                            invitor_id,
                                            invitee,
                                            invite_type_id,
                                            created_at,
                                            updated_at,
                                            token
                                            )
SELECT $1, $2, inv, 1, now(), now(), uuid_generate_v4()
FROM json_array_elements_text($3 :: JSON) inv

ON CONFLICT (network_id, invitee) DO UPDATE SET updated_at=now(), token=uuid_generate_v4() RETURNING
    network_invite_id AS "networkInviteId",
    network_id AS "networkId",
    invitor_id AS "invitorId",
    invitee AS "invitee",
    created_at AS "createdAt",
    updated_at AS "updatedAt",
    token AS "token";`,
        delete: `DELETE
FROM virtual_network.network_invites
WHERE network_invite_id = (SELECT ni.network_invite_id FROM virtual_network.network_invites ni
                                           INNER JOIN virtual_network.networks n ON ni.network_id = n.network_id
                        WHERE n.customer_id=$1 AND ni.network_invite_id=$3 AND n.network_id=$2);`
      },
      subscription: {
        trial: `INSERT INTO virtual_network.network_trial_periods AS ntp (network_id, ended_at)
VALUES ($1, to_timestamp($2))
ON CONFLICT (network_id) DO UPDATE SET qnt = ntp.qnt + 1 RETURNING ntp.network_id AS "networkId", ntp.started_at AS "startedAt", ntp.ended_at AS "endedAt", qnt;`,
        endTrial: `UPDATE virtual_network.network_trial_periods
SET active= FALSE, deactivated_at=NOW()
WHERE network_id = $1 RETURNING active,
  deactivated_at AS "deactivatedAt", network_id AS "networkId"`
      }
    },
    get: {
      users: `SELECT u.user_id AS "userId", u.username AS "username" FROM virtual_network.network_users nu
INNER JOIN backend.users u ON nu.user_id = u.user_id
WHERE nu.network_id=$1 AND u.status=1;`,
      all: {
        networks: {
          records: `SELECT network_id AS "networkId",
       nickname AS "nickname",
       description AS "description",
       label AS "label",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
        FROM virtual_network.networks where customer_id=$1 AND status_id=1 ORDER BY network_id DESC LIMIT $2 OFFSET $3;`,
          count: 'SELECT count(1) AS count FROM virtual_network.networks where customer_id=$1 AND status_id=1;',
          byEmailOrNickName: `SELECT n.nickname AS "nickname"
FROM virtual_network.networks n
       INNER JOIN virtual_network.network_admins na ON n.network_id = na.network_id
       INNER JOIN dashboard.administrators a ON na.admin_id = a.administrator_id
WHERE (($2::TEXT IS NULL OR n.nickname = $2::TEXT) OR ($3::TEXT IS NULL OR a.email = $3::TEXT)) AND
      n.customer_id = $1 AND n.status_id=1`,
          byInviteOrNickname: `SELECT n.network_id AS "networkId",
       n.nickname AS "nickname",
       n.description AS "description",
       n.call_name AS "callName",
       n.label AS "label"
FROM virtual_network.networks n
WHERE ((n.nickname = $2 AND n.public=TRUE) OR n.network_id = (SELECT network_id
                                          FROM virtual_network.network_invites
                                          WHERE ($3::TEXT IS NULL OR invitee = $3::TEXT ) AND
                                          token = $2)) AND n.customer_id = $1 AND status_id=1;`,
        },
        networkUsers: {
          records: `SELECT nu.network_id AS "networkId",
       nu.user_id AS "userId",
       replace(u.username, $3::TEXT, '') AS number,
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName"

FROM virtual_network.network_users nu
       INNER JOIN backend.users u ON nu.user_id = u.user_id
       LEFT JOIN backend.user_attributes ua1
                 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
       LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
WHERE u.customer_id = $1 AND nu.network_id = $2 ORDER BY nu.network_user_id DESC LIMIT $4 OFFSET $5;`,
          count: `SELECT count(nu.user_id) AS "count"
FROM virtual_network.network_users nu
       INNER JOIN backend.users u ON nu.user_id = u.user_id
WHERE u.customer_id = $1 AND nu.network_id = $2;`,
        }
      },
      one: {
        network: `SELECT n.network_id AS "networkId",
       n.nickname AS "nickname",
       n.label AS "label",
       n.call_name AS "callName",
       n.description AS "description",
       n.created_at AS "createdAt",
       n.updated_at AS "updatedAt",
       n.public AS "isPublic"
          FROM virtual_network.networks n
WHERE n.customer_id = $1 AND n.network_id = $2;`,
        networkUser: `SELECT nu.network_id AS "networkId",
       nu.user_id AS "userId",
       u.username AS "username"
FROM virtual_network.network_users nu
       INNER JOIN backend.users u ON nu.user_id = u.user_id
       LEFT JOIN virtual_network.network_admins na ON nu.network_id = na.network_id
WHERE u.customer_id = $1 AND nu.network_id = $2 AND nu.user_id = $3 AND ($4::INT IS NULL OR na.admin_id = $4::INT);`
      },
      state: `SELECT n.network_id AS "networkId", n.stripe_id AS "stripeId",
       json_build_object(
           'nickname', n.nickname,
           'label', n.label,
           'description', n.description,
           'createdAt', n.created_at,
           'callName', n.call_name,
           'isPublic', n.public
         ) AS network,
       json_build_object(
           'going', (tp.network_trial_period_id IS NOT NULL AND tp.active = TRUE),
           'end', (tp.network_trial_period_id IS NOT NULL AND tp.active = FALSE),
           'notUsed', (tp.network_trial_period_id IS NULL),
           'params', CASE WHEN tp IS NOT NULL
                            THEN json_build_object('start', tp.started_at, 'end', tp.ended_at)
                          ELSE NULL END
         ) AS trial,
          json_build_object(
           'env', pd.env,
           'planLicensed', pd.licensed_plan,
           'planMetered', pd.metered_plan,
           'product', pd.product
         ) AS defaults,
       s.subscription_id IS NOT NULL AND s.object_id IS NOT NULL AS "subscribed",
       n.stripe_id IS NOT NULL AS "hasPaymentMethod",
       n.stripe_id IS NOT NULL AS "hasPaymentMethod"
FROM virtual_network.networks n
       LEFT JOIN payment.subscriptions s ON n.network_id = s.network_id
       LEFT JOIN virtual_network.network_trial_periods tp ON n.network_id = tp.network_id
      LEFT JOIN payment.payment_defaults pd ON pd.env='production'
WHERE n.network_id = $1
GROUP BY n.network_id, s.subscription_id, tp.network_trial_period_id, pd.payment_default_id`
    },
    update: {
      network: `UPDATE virtual_network.networks
SET nickname    = coalesce($3, nickname),
    label       = coalesce($4, label),
    call_name   = coalesce($5, call_name),
    description = coalesce($6, description),
    public = coalesce($7, public),
    updated_at  = now()
WHERE customer_id = $1 AND network_id = $2 RETURNING updated_at AS "updatedAt", nickname;`,
      status: `WITH insertNetworkStatus AS (
  INSERT INTO virtual_network.network_statuses(network_id, network_status_type_id, created_at) VALUES ($2::INT, $3::INT, NOW()) RETURNING network_id, network_status_type_id AS "status_id"
)
UPDATE virtual_network.networks
SET status_id=(SELECT status_id FROM insertNetworkStatus)
WHERE customer_id = $1 AND network_id = (SELECT insertNetworkStatus.network_id FROM insertNetworkStatus)
      RETURNING status_id AS "statusId", network_id AS "networkId";`
    },
    delete: {
      network: `WITH insertNetworkStatus AS (
  INSERT INTO virtual_network.network_statuses(network_id, network_status_type_id, created_at) VALUES ($2::INT, 2, NOW()) RETURNING network_id, network_status_type_id AS "status_id"
)
UPDATE virtual_network.networks
SET status_id=(SELECT status_id FROM insertNetworkStatus)
WHERE customer_id = $1 AND network_id = (SELECT insertNetworkStatus.network_id FROM insertNetworkStatus)
      RETURNING status_id AS "statusId", network_id AS "networkId";`,
      networkUser: {
        kick: 'SELECT virtual_network."kick"($1, $2, $3, $4) AS "network";',
        leave: 'SELECT virtual_network."leave"($1, $2, $3) AS "network";',
      },
      notifier: `DELETE
FROM virtual_network.network_invite_notifiers
WHERE network_invite_notifier_id = $1 AND network_consumer_id = $2 AND user_id = $3;`
    },
    create: {
      request: `INSERT INTO virtual_network.network_registration_requests (customer_id, email, password, nickname, network_full_name,
                                                           first_name, last_name,
                                                           token, created_at,
                                                           status)
VALUES ($1, $2, crypt($3::TEXT, gen_salt('bf', 8)), $4, $5, $6, $7, uuid_generate_v4(), NOW(),
        1)
ON CONFLICT (customer_id, email) DO UPDATE SET password = crypt($3::TEXT, gen_salt('bf', 8)),
  nickname = $4, network_full_name = $5, first_name = $6, last_name = $7, token = uuid_generate_v4(), updated_at = NOW(), status=1
             RETURNING email, token, nickname, created_at AS "createdAt";`,
      networkByRequest: 'SELECT virtual_network."verifyAndCreateNetwork"($1, $2) AS network',
      networkByAdmin: 'SELECT virtual_network."create" ($1,$2,$3,$4,$5,$6) AS "networkId";',
      networkUser: 'SELECT virtual_network."join"($1, $2, $3) AS "network";',
      consumerEvent: `INSERT INTO virtual_network.network_consumer_events (network_consumer_id, network_consumer_event_type_id, data)
VALUES ($1, $2, $3) RETURNING network_consumer_id AS "networkConsumerId",
                    network_consumer_event_type_id AS "eventTypeId";`,
      notifier: `INSERT INTO virtual_network.network_invite_notifiers (network_consumer_id, user_id)
SELECT $1, u.user_id
FROM backend.users u
WHERE u.username IN (SELECT k AS "username" FROM json_array_elements_text($2::JSON) k )
ON CONFLICT (network_consumer_id, user_id) DO NOTHING;`
    },
    retrieve: {
      consumerNetwork: `SELECT nc.network_consumer_id AS "networkConsumerId",
       nc.network_id AS "networkId",
       json_agg(json_build_object('adminId', na.admin_id)) AS "admins"
FROM virtual_network.network_consumers nc
         INNER JOIN virtual_network.networks n ON nc.network_id = n.network_id
         LEFT JOIN virtual_network.network_admins na ON nc.network_id = na.network_id
WHERE n.customer_id = $1::INT AND nc.secret = $2::TEXT AND n.status_id IN (1, 5, 6)
GROUP BY nc.network_consumer_id;`,
      consumer: 'SELECT network_id AS "networkId", uri FROM virtual_network.network_consumers WHERE network_consumer_id=$1'
    },
    list: {
      services: `SELECT s.service_id AS "serviceId", s.label, s.nickname, s.created_at,
       json_build_object('statusId', ss.service_status_id, 'name', ss.name) AS status,
       json_build_object('typeId', st.service_type_id, 'name', st.name) AS type
FROM virtual_network.services s
         INNER JOIN virtual_network.service_types st ON s.service_type_id = st.service_type_id
         INNER JOIN virtual_network.service_statuses ss ON s.service_status_id = ss.service_status_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
WHERE n.customer_id = $1 AND n.network_id = $2
ORDER BY s.service_id DESC
LIMIT $3
OFFSET $4;`
    }

  },
  email: {
    get: {
      one: `SELECT template_id AS "templateId",
       subject,
       content
FROM internal.templates
WHERE "template_id" = $1;`
    }
  },
  customers: {
    get: {
      ids: `SELECT customer_id AS "customerId", name, prefix, currency, customer_business_number AS "number"
FROM customer.customers ca
WHERE ca.active = TRUE ORDER BY customer_id DESC;`
    },
    list: {
      customers: `SELECT customer_id AS "customerId", name, prefix, currency, customer_business_number AS "number"
FROM customer.customers ca
WHERE ca.active = TRUE
ORDER BY customer_id DESC
LIMIT $1 OFFSET $2;`
    },
    count: {
      customers: `SELECT CAST(count(1) AS INT) as count
FROM customer.customers ca
WHERE ca.active = TRUE`
    },
    update: {
      status: 'UPDATE customer.customers c SET c.customer_status = $2 WHERE c.customer_id = $1;'
    }
  },
  stats: {
    network: {
      messages: {
        getCountByRegion: `SELECT tc.region_code AS "regionCode",
         cast(tc.timeline_country_id AS INT) AS "regionId",
       coalesce(sum(ntm.value), 0) AS "value"
FROM metrics.network_timeline_metrics ntm
       INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND ntm.metric_type_id IN (1, 4) AND ntm.network_id = $2 AND
      ct.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
GROUP BY tc.timeline_country_id
ORDER BY "value" DESC;`,
        getCountByDate: `SELECT ct.created_at AS "createdAt",
       coalesce(sum(ntm.value), 0) AS "value"
FROM metrics.network_timeline_metrics ntm
       INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND ntm.metric_type_id IN (1,4) AND ntm.network_id=$2 AND ($3::TEXT IS NULL OR tc.region_code = $3::TEXT)  AND
      ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
GROUP BY ct.created_at
ORDER BY ct.created_at ASC;`,
        types: {
          getGroupOrSingleMessageCount: `SELECT json_build_object('metricTypeId', mt.metric_type_id, 'name', mt.name) AS "metricType",
       coalesce(sum(ntm.value), 0) AS "value"
FROM metrics.network_timeline_metrics ntm
       INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
       INNER JOIN metrics.metric_types mt ON ntm.metric_type_id = mt.metric_type_id
WHERE ct.customer_id = $1 AND ntm.metric_type_id IN (1, 4) AND ntm.network_id=$2 AND ($3::TEXT IS NULL OR tc.region_code = $3::TEXT) AND
      ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
GROUP BY mt.metric_type_id
ORDER BY "value" DESC;`,
          getGroupOrSingleMessageRecords: `SELECT mct.name AS "metricContextType",
       sum(ntm.value) AS "value"
FROM metrics.network_timeline_metrics ntm
       INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.metric_context_types mct ON ntm.metric_context_type_id = mct.metric_context_type_id
       INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND ntm.metric_type_id = $2 AND ntm.network_id = $3 AND ($4::TEXT IS NULL OR tc.region_code = $4::TEXT) AND
      ct.created_at :: DATE BETWEEN $5 :: DATE AND $6 :: DATE
GROUP BY ntm.metric_type_id, mct.metric_context_type_id
ORDER BY "value" DESC`,
        }
      },
      calls: {
        getCountByRegion: `SELECT tc.region_code AS "regionCode",
         cast(tc.timeline_country_id AS INT) AS "regionId",
         coalesce(sum(ntm.value), 0) AS "value"
  FROM metrics.network_timeline_metrics ntm
         INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
         INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
  WHERE ct.customer_id = $1 AND ntm.metric_type_id = $2 AND ntm.network_id=$3 AND
      ((ntm.metric_type_id = 6 AND ntm.metric_context_type_id = 17) OR
       (ntm.metric_type_id = 2 AND ntm.metric_context_type_id = 11) OR
       (ntm.metric_type_id = 3 AND ntm.metric_context_type_id = 14)) AND
        ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
  GROUP BY tc.timeline_country_id
  ORDER BY "value" DESC;`,
        getCountByDate: `SELECT mt.metric_type_id AS "metricTypeId", mt.name,
         json_agg(json_build_object('createdAt', a.created_at, 'value', a.value)) AS "timeline"
  FROM metrics.metric_types mt
         LEFT JOIN (
    SELECT ntm.metric_type_id,
           ct.created_at,
           coalesce(sum(ntm.value), 0) AS "value"
    FROM metrics.network_timeline_metrics ntm
           INNER JOIN metrics.customer_timeline ct ON ntm.customer_timeline_id = ct.customer_timeline_id
           INNER JOIN metrics.timeline_countries tc ON ntm.timeline_country_id = tc.timeline_country_id
    WHERE ct.customer_id = $1 AND ntm.network_id=$2 AND (
          (ntm.metric_type_id = 2 AND ntm.metric_context_type_id = 11) OR
          (ntm.metric_type_id = 3 AND ntm.metric_context_type_id = 14) OR
          (ntm.metric_type_id = 6 AND ntm.metric_context_type_id = 17) OR
          (ntm.metric_type_id = 7
            OR ntm.metric_type_id = 8
            OR ntm.metric_type_id = 9) )
            AND
          ($3::TEXT IS NULL OR tc.region_code = $3::TEXT) AND
          ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
    GROUP BY ntm.metric_type_id, ct.created_at
    ORDER BY ct.created_at ASC
  ) AS a ON mt.metric_type_id = a.metric_type_id
  WHERE mt.metric_type_id IN (2, 3, 6, 7, 8, 9)
  GROUP BY a.metric_type_id, mt.metric_type_id;`
      },
      presences: {
        list: {
          presences: `SELECT upi.network_user_presence_instance_id AS "presenceInstanceId", upi.number AS "number"
          FROM metrics.network_user_presence_instances upi
          WHERE upi.customer_id = $1 AND upi.network_id = $2 AND upi.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
          ORDER BY created_at
          LIMIT $5
          OFFSET $6`
        },
        count: {
          presences: `SELECT coalesce(sum(upm.value), 0) AS count
          FROM metrics.network_user_presence_metrics upm
          WHERE upm.customer_id = $1 AND upm.network_id = $2 AND upm.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE;`
        }
      }
    },
    console: {
      messages: {
        getCountByRegion: `SELECT tc.region_code AS "regionCode",
         cast(tc.timeline_country_id AS INT) AS "regionId",
       coalesce(sum(tm.value), 0) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND tm.metric_type_id IN (1, 4) AND
      ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE
GROUP BY tc.timeline_country_id
ORDER BY "value" DESC;`,
        getCountByDate: `SELECT ct.created_at AS "createdAt",
       coalesce(sum(tm.value), 0) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND tm.metric_type_id IN (1,4) AND ($2::TEXT IS NULL OR tc.region_code = $2::TEXT) AND
      ct.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
GROUP BY ct.created_at
ORDER BY ct.created_at ASC;`,
        types: {
          getGroupOrSingleMessageCount: `SELECT json_build_object('metricTypeId', mt.metric_type_id, 'name', mt.name) AS "metricType",
       coalesce(sum(tm.value), 0) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
       INNER JOIN metrics.metric_types mt ON tm.metric_type_id = mt.metric_type_id
WHERE ct.customer_id = $1 AND tm.metric_type_id IN (1, 4) AND ($2::TEXT IS NULL OR tc.region_code = $2::TEXT) AND
      ct.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
GROUP BY mt.metric_type_id
ORDER BY "value" DESC;`,
          getGroupOrSingleMessageRecords: `SELECT mct.name AS "metricContextType",
       sum(tm.value) AS "value"
FROM metrics.timeline_metrics tm
       INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
       INNER JOIN metrics.metric_context_types mct ON tm.metric_context_type_id = mct.metric_context_type_id
       INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
WHERE ct.customer_id = $1 AND tm.metric_type_id = $2 AND ($3::TEXT IS NULL OR tc.region_code = $3::TEXT) AND
      ct.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE
GROUP BY tm.metric_type_id, mct.metric_context_type_id
ORDER BY "value" DESC`,
        }
      },
      calls: {
        getCountByRegion: `SELECT tc.region_code AS "regionCode",
         cast(tc.timeline_country_id AS INT) AS "regionId",
         coalesce(sum(tm.value), 0) AS "value"
  FROM metrics.timeline_metrics tm
         INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
         INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
  WHERE ct.customer_id = $1 AND tm.metric_type_id = $2 AND
      ((tm.metric_type_id = 6 AND tm.metric_context_type_id = 17) OR
       (tm.metric_type_id = 2 AND tm.metric_context_type_id = 11) OR
       (tm.metric_type_id = 3 AND tm.metric_context_type_id = 14)) AND
        ct.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
  GROUP BY tc.timeline_country_id
  ORDER BY "value" DESC;`,
        getCountByDate: `SELECT mt.metric_type_id AS "metricTypeId", mt.name,
         json_agg(json_build_object('createdAt', a.created_at, 'value', a.value)) AS "timeline"
  FROM metrics.metric_types mt
         LEFT JOIN (
    SELECT tm.metric_type_id,
           ct.created_at,
           coalesce(sum(tm.value), 0) AS "value"
    FROM metrics.timeline_metrics tm
           INNER JOIN metrics.customer_timeline ct ON tm.customer_timeline_id = ct.customer_timeline_id
           INNER JOIN metrics.timeline_countries tc ON tm.timeline_country_id = tc.timeline_country_id
    WHERE ct.customer_id = $1 AND (
          (tm.metric_type_id = 2 AND tm.metric_context_type_id = 11) OR
          (tm.metric_type_id = 3 AND tm.metric_context_type_id = 14) OR
          (tm.metric_type_id = 6 AND tm.metric_context_type_id = 17) OR
          (tm.metric_type_id = 7
            OR tm.metric_type_id = 8
            OR tm.metric_type_id = 9) )
            AND
          ($2::TEXT IS NULL OR tc.region_code = $2::TEXT) AND
          ct.created_at :: DATE BETWEEN $3 :: DATE AND $4 :: DATE
    GROUP BY tm.metric_type_id, ct.created_at
    ORDER BY ct.created_at ASC
  ) AS a ON mt.metric_type_id = a.metric_type_id
  WHERE mt.metric_type_id IN (2, 3, 6, 7, 8, 9)
  GROUP BY a.metric_type_id, mt.metric_type_id;`
      },
      users: {
        getCountByRegion: `SELECT c1.name AS "countryName",
           c1.region_code AS "regionCode",
           CAST(coalesce((sum(urm.email + urm.mobile) FILTER (WHERE urm.metric_type_id = 10)), 0) AS DOUBLE PRECISION ) AS total,
           json_build_object(
                   'email', coalesce((sum(urm.email) FILTER (WHERE urm.metric_type_id = 10)), 0),
                   'mobile', coalesce((sum(urm.mobile) FILTER (WHERE urm.metric_type_id = 10)), 0)
               ) AS "registered",
           json_build_object(
                   'email', coalesce(greatest((sum(CASE WHEN urm.metric_type_id = 10
                                                            THEN -urm.email
                                                        WHEN urm.metric_type_id = 11
                                                            THEN + urm.email END)
                                               FILTER (WHERE urm.metric_type_id IN (10, 11))), 0), 0),
                   'mobile', coalesce(greatest((sum(CASE WHEN urm.metric_type_id = 10
                                                             THEN -urm.mobile
                                                         WHEN urm.metric_type_id = 11
                                                             THEN + urm.mobile END)
                                                FILTER (WHERE urm.metric_type_id IN (10, 11))), 0), 0)
               ) AS "notVerified",
           json_build_object(
            'ios', sum(urm.mobile + urm.email) FILTER (WHERE p.platform_id=1 AND urm.metric_type_id IN (10)),
            'android', sum(urm.mobile + urm.email) FILTER (WHERE p.platform_id=2 AND urm.metric_type_id IN (10))
                   ) AS "platforms"

    FROM metrics.user_registration_platform_metrics urm
             INNER JOIN metrics.customer_timeline ct ON urm.customer_timeline_id = ct.customer_timeline_id
             INNER JOIN internal.platforms p ON urm.platform_id = p.platform_id
             INNER JOIN internal.countries c1 ON urm.country_id = c1.country_id

    WHERE ct.customer_id = $1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND
          urm.metric_type_id IN (10, 11)
    GROUP BY c1.country_id
    ORDER BY total DESC;`,
        getCountByDate: `SELECT coalesce((sum(urm.email)), 0) AS email,
       coalesce((sum(urm.mobile)), 0) AS mobile,
       ct.created_at AS "createdAt"

FROM metrics.user_registration_metrics urm
         INNER JOIN metrics.customer_timeline ct ON urm.customer_timeline_id = ct.customer_timeline_id
         INNER JOIN internal.countries c1 ON urm.country_id = c1.country_id

WHERE ct.customer_id = $1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND
      urm.metric_type_id = 10 AND ($4::TEXT IS NULL OR c1.region_code = $4)
GROUP BY ct.customer_timeline_id
ORDER BY "createdAt";`,
        getOverview: `WITH getPlatformMetrics AS (
        SELECT sum(urpm.mobile + urpm.email) AS "count", p.name
        FROM metrics.user_registration_platform_metrics urpm
                 INNER JOIN internal.platforms p ON urpm.platform_id = p.platform_id
                 INNER JOIN metrics.customer_timeline ct ON urpm.customer_timeline_id = ct.customer_timeline_id
                 INNER JOIN internal.countries c1 ON urpm.country_id = c1.country_id

        WHERE ct.customer_id = $1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND
              urpm.metric_type_id IN (10) AND ($4::TEXT IS NULL OR c1.region_code = $4)
        GROUP BY p.platform_id
    )
    SELECT cast(coalesce((sum(urm.email + urm.mobile) FILTER (WHERE urm.metric_type_id = 10)),
                         0) AS DOUBLE PRECISION) AS total,
           json_build_object(
                   'email', coalesce((sum(urm.email) FILTER (WHERE urm.metric_type_id = 10)), 0),
                   'mobile', coalesce((sum(urm.mobile) FILTER (WHERE urm.metric_type_id = 10)), 0)
               ) AS "registered",
           json_build_object(
                   'email', coalesce(greatest((sum(CASE WHEN urm.metric_type_id = 10
                                                            THEN -urm.email
                                                        WHEN urm.metric_type_id = 11
                                                            THEN + urm.email END)
                                               FILTER (WHERE urm.metric_type_id IN (10, 11))), 0), 0),
                   'mobile', coalesce(greatest((sum(CASE WHEN urm.metric_type_id = 10
                                                             THEN -urm.mobile
                                                         WHEN urm.metric_type_id = 11
                                                             THEN + urm.mobile END)
                                                FILTER (WHERE urm.metric_type_id IN (10, 11))), 0), 0)
               ) AS "notVerified",
           (SELECT json_agg(json_build_object('count', p.count, 'name', p.name)) FROM getPlatformMetrics p) AS platforms
    FROM metrics.user_registration_metrics urm
             INNER JOIN metrics.customer_timeline ct ON urm.customer_timeline_id = ct.customer_timeline_id
             INNER JOIN internal.countries c1 ON urm.country_id = c1.country_id

    WHERE ct.customer_id = $1 AND ct.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE AND
          urm.metric_type_id IN (10, 11) AND ($4::TEXT IS NULL OR c1.region_code = $4);`
      },
      presences: {
        list: {
          presences: `SELECT upi.user_presence_instance_id AS "presenceInstanceId", upi.number AS "number"
          FROM metrics.user_presence_instances upi
          WHERE upi.customer_id = $1 AND upi.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE
          ORDER BY created_at
          LIMIT $4
          OFFSET $5`
        },
        count: {
          presences: `SELECT coalesce(sum(upm.value), 0) AS count
          FROM metrics.user_presence_metrics upm
          WHERE upm.customer_id = $1 AND upm.created_at :: DATE BETWEEN $2 :: DATE AND $3 :: DATE;`
        }
      }
    },
    metricTypes: {
      getCallMetricTypes: `SELECT metric_type_id AS "metricTypeId", name
FROM metrics.metric_types
WHERE metric_type_id IN (2, 3, 6);`
    }
  },
  admin: {
    get: {
      attributes: `SELECT a."administrator_id" AS "adminId",
                   a.email AS "email",
                   n.network_id AS "networkId",
                   greatest(0, c.trial_end::date - now()::date) AS "trialDays",
                   CASE
                       WHEN (c.customer_package_id = 4 AND ((c.trial_end::date - now()::date) < 1 AND (ps.paid = false OR sca.customer_id IS NULL)))
                           THEN 'FAIL'
                       ELSE 'SUCCESS'
                       END AS "paymentStatus",
                   json_agg(
                           json_build_object('attributeId', at.attribute_id, 'attributeName', at.name, 'value',
                                             coalesce(aa.value, ''))
                           ORDER BY at.attribute_id ASC)        AS attributes,
                   ar.role_id = 1                               AS "isSuper",
                   ar.role_id = 2                               AS "readonly"
            FROM dashboard."administrators" a
                     LEFT JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
                     LEFT JOIN virtual_network.networks n ON na.network_id = n.network_id
                     LEFT JOIN core.attributes at ON at.attribute_id IN (2, 3, 4, 8)
                     LEFT JOIN dashboard.administrator_attributes aa
                               ON aa.attribute_id = at.attribute_id AND aa.administrator_id = a.administrator_id
                     LEFT JOIN dashboard.administrator_roles ar ON a.administrator_id = ar.administrator_id
                     LEFT JOIN customer.customers c ON c.customer_id = a.customer_id
                     LEFT JOIN (SELECT * FROM stripe.payment_status WHERE paid = false) AS ps ON ps.customer_id = c.customer_id
                     LEFT JOIN stripe.stripe_customers sc ON c.customer_id = sc.customer_id
                     LEFT JOIN stripe.cards sca ON sca.customer_id = sc.stripe_customer_id
            WHERE a.customer_id = $1
                AND ($2::INT IS NULL OR na.network_id = $2::INT)
                AND a.administrator_id = $3
            GROUP BY a.administrator_id, n.network_id, ar.role_id, c.customer_id, ps.paid, sca.customer_id;`,
      channelAdminAttributes: `SELECT a."administrator_id" AS "adminId",
       a.email AS "email",
       cha.room_name AS "roomName",
       json_agg(
           json_build_object('attributeId', at.attribute_id, 'attributeName', at.name, 'value', coalesce(aa.value, ''))
           ORDER BY at.attribute_id ASC) AS attributes,
                  ar.role_id = 1 AS "isSuper"
FROM dashboard."administrators" a
       LEFT JOIN dashboard.channel_admins cha ON a.administrator_id = cha.admin_id
       LEFT JOIN core.attributes at ON at.attribute_id IN (2, 3, 4, 8)
       LEFT JOIN dashboard.administrator_attributes aa
                 ON aa.attribute_id = at.attribute_id AND aa.administrator_id = a.administrator_id
       LEFT JOIN dashboard.administrator_roles ar ON a.administrator_id = ar.administrator_id

WHERE a.customer_id = $1 AND ($2::TEXT IS NULL OR cha.room_name = $2::TEXT) AND a.administrator_id = $3
                   GROUP BY a.administrator_id, cha.room_name, ar.role_id`,
      adminByEmail: 'SELECT email AS "email" FROM dashboard.administrators WHERE email = $1::TEXT;'
    },
    create: {
      adminRole: `INSERT INTO dashboard.administrator_roles (role_id, administrator_id) 
                    VALUES ($1, $2)
                  RETURNING "administrator_id"`,
      attributes: `INSERT INTO dashboard.administrator_attributes (administrator_id, attribute_id, value)
SELECT $1::INT AS admin_id, (k ->> 'attributeId')::INT AS "attributeId", (k ->> 'value')::TEXT AS value
FROM json_array_elements($2::JSON) k
ON CONFLICT (administrator_id, attribute_id)
  DO UPDATE SET administrator_id = EXCLUDED.administrator_id, attribute_id = EXCLUDED.attribute_id,
                value            = EXCLUDED.value
                RETURNING administrator_attribute_id AS "adminAttributeId", attribute_id AS "attributeId", value;`
    },
    update: {
      password: `UPDATE dashboard.administrators
      SET password = crypt($4::TEXT, gen_salt('bf', 8)), updated_at = now()
      WHERE administrator_id =
            (SELECT administrator_id
             FROM dashboard.administrators a
                      LEFT JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
             WHERE a.customer_id = $1 AND ($2::INT IS NULL OR na.network_id = $2::INT) AND a.administrator_id = $3)
      RETURNING updated_at AS "updatedAt";`
    },
    list: {
      admins: `SELECT a.administrator_id AS "adminId",
             a.email AS "email",
             CASE WHEN na.network_admin_id IS NOT NULL
                      THEN json_build_object('networkId', n.network_id, 'nickname', n.label) END AS "network"
      FROM dashboard.administrators a
               LEFT JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
               LEFT JOIN virtual_network.networks n ON na.network_id = n.network_id
      WHERE a.customer_id = $1 AND ($2::INT IS NULL OR na.network_id = $2)
      ORDER BY na.network_admin_id DESC, a.administrator_id DESC
      LIMIT $3
      OFFSET $4;`,
      channelAdmins: `SELECT a.administrator_id AS "adminId",
             a.email AS "email"
      FROM dashboard.administrators a
               LEFT JOIN dashboard.channel_admins ca ON a.administrator_id = ca.admin_id
      WHERE a.customer_id = $1 AND ($2::TEXT IS NULL OR ca.room_name = $2)
      ORDER BY ca.channel_admin_id DESC, a.administrator_id DESC
      LIMIT $3
      OFFSET $4;`
    },
    count: {
      admins: `SELECT count(1) AS count
      FROM dashboard.administrators a
               LEFT JOIN virtual_network.network_admins na ON a.administrator_id = na.admin_id
               LEFT JOIN virtual_network.networks n ON na.network_id = n.network_id
      WHERE a.customer_id = $1 AND ($2::INT IS NULL OR na.network_id = $2)`,
      channelAdmins: `SELECT count(1) AS count
      FROM dashboard.administrators a
               LEFT JOIN dashboard.channel_admins ca ON a.administrator_id = ca.admin_id
      WHERE a.customer_id = $1 AND ($2::Text IS NULL OR ca.room_name = $2)`
    }
  },
  providers: {
    list: {
      providers: `SELECT ctpp.customer_third_party_provider_id AS "providerId",
       tpp.key AS "name",
       coalesce(ctpp.label, '') AS "label",
       json_build_object(
               'providerTypeId', tpp.third_party_provider_id,
               'typeId', tpp.type_id,
               'name', tppt.name
           ) AS "providerType",
       ctpp.created_at AS "createdAt",
       ctpp.order AS "orderNumber",
       ctpp.active AS "active"

FROM customer.customer_third_party_providers ctpp
         INNER JOIN internal.third_party_providers tpp ON ctpp.third_party_provider_id = tpp.third_party_provider_id
         INNER JOIN internal.third_party_provider_types tppt ON tpp.type_id = tppt.third_party_provider_type_id
WHERE ctpp.customer_id = $1 AND ctpp.is_deleted = FALSE AND ($2::TEXT IS NULL OR upper(tppt.name) = upper($2))
GROUP BY ctpp.customer_third_party_provider_id, tpp.third_party_provider_id, tppt.third_party_provider_type_id
ORDER BY ctpp.order ASC
LIMIT $3 OFFSET $4;`,
      providerTypes: `SELECT tp2.third_party_provider_id AS "tp2Id",
       tp2.name AS "label",
       tp2.key AS "name",
       tp2.config,
       json_build_object(
               'tp2tId', tp2t.third_party_provider_type_id,
               'label', tp2t.name
           ) AS type
FROM internal.third_party_providers tp2
         INNER JOIN internal.third_party_provider_types tp2t ON tp2.type_id = tp2t.third_party_provider_type_id
GROUP BY tp2.third_party_provider_id, tp2t.third_party_provider_type_id
ORDER BY tp2.third_party_provider_id ASC
LIMIT $1
OFFSET $2;`,
      countries: `SELECT ctppc.customer_provider_countries_id AS "providerCountryId",
       ctpp.third_party_provider_id AS "providerId",
       json_build_object('countryId', c.country_id, 'name', c.name) AS country
FROM customer.customer_third_party_provider_countries ctppc
         INNER JOIN customer.customer_third_party_providers ctpp
                    ON ctppc.customer_third_party_provider_id = ctpp.customer_third_party_provider_id
         INNER JOIN internal.countries c ON ctppc.country_id = c.country_id
WHERE ctpp.customer_id = $1 AND ctppc.customer_third_party_provider_id = $2
ORDER BY ctppc.customer_provider_countries_id DESC
LIMIT $3
    OFFSET $4;`,
      countryProviders: `SELECT c1.country_id AS "countryId",
             c1.region_code AS "regionCode",
             c1.name AS "name",
             json_agg(CASE WHEN c2 IS NOT NULL
                               THEN json_build_object('label', c2.label, 'type', c2.type)
                           ELSE NULL END) AS providers
      FROM internal.countries c1
               LEFT JOIN (SELECT ctppc.country_id, ctpp.customer_third_party_provider_id, ctpp.label, tppt.name AS type
                          FROM customer.customer_third_party_provider_countries ctppc
                                   INNER JOIN customer.customer_third_party_providers ctpp
                                              ON ctppc.customer_third_party_provider_id =
                                                 ctpp.customer_third_party_provider_id
                                   INNER JOIN internal.third_party_providers tpp
                                              ON ctpp.third_party_provider_id = tpp.third_party_provider_id
                                   INNER JOIN internal.third_party_provider_types tppt
                                              ON tpp.type_id = tppt.third_party_provider_type_id
                          WHERE ctpp.customer_id = $1 AND ctpp.active = TRUE
                          ORDER BY ctpp."order"
      ) c2 ON c1.country_id = c2.country_id
      GROUP BY c1.country_id
      ORDER BY c1.name;`
    },
    count: {
      providers: `SELECT cast(count(ctpp.customer_third_party_provider_id) AS INT) AS count
FROM customer.customer_third_party_providers ctpp
         INNER JOIN internal.third_party_providers tpp ON ctpp.third_party_provider_id = tpp.third_party_provider_id
         INNER JOIN internal.third_party_provider_types tppt ON tpp.type_id = tppt.third_party_provider_type_id
WHERE ctpp.customer_id = $1 AND ctpp.is_deleted = FALSE AND ($2::TEXT IS NULL OR upper(tppt.name) = upper($2));`,
      providerTypes: `SELECT cast(count(tp2.third_party_provider_id) AS INT) AS "count"
FROM internal.third_party_providers tp2
         INNER JOIN internal.third_party_provider_types tp2t ON tp2.type_id = tp2t.third_party_provider_type_id;`,
      countries: `SELECT cast(count(1) AS INT)
FROM customer.customer_third_party_provider_countries ctppc
         INNER JOIN customer.customer_third_party_providers ctpp
                    ON ctppc.customer_third_party_provider_id = ctpp.customer_third_party_provider_id
         INNER JOIN internal.countries c ON ctppc.country_id = c.country_id
WHERE ctpp.customer_id = $1 AND ctppc.customer_third_party_provider_id = $2;`
    },
    retrieve: {
      provider: `SELECT ctpp.customer_third_party_provider_id AS "providerId",
       tpp.key AS "name",
       coalesce(ctpp.label, '') AS "label",
       json_build_object(
               'tp2Id', tpp.third_party_provider_id,
               'typeId', tpp.type_id,
               'name', tppt.name
           ) AS "providerType",
       ctpp.config AS "config",
       ctpp.created_at AS "createdAt",
       ctpp.order AS "orderNumber",
       ctpp.active AS "active"

FROM customer.customer_third_party_providers ctpp
         INNER JOIN internal.third_party_providers tpp ON ctpp.third_party_provider_id = tpp.third_party_provider_id
         INNER JOIN internal.third_party_provider_types tppt ON tpp.type_id = tppt.third_party_provider_type_id
WHERE ctpp.customer_id = $1 AND ctpp.is_deleted = FALSE AND ctpp.customer_third_party_provider_id =$2
GROUP BY ctpp.customer_third_party_provider_id, tpp.third_party_provider_id, tppt.third_party_provider_type_id;`,
      countryProviders: `SELECT 
            ctppc.customer_provider_countries_id AS "countryProviderId",
            ctpp.customer_third_party_provider_id AS "providerId",
            tpp.key AS "name",
             coalesce(ctpp.label, '') AS "label",
             json_build_object(
                     'providerTypeId', tpp.third_party_provider_id,
                     'typeId', tpp.type_id,
                     'name', tppt.name
                 ) AS "providerType",
             ctpp.created_at AS "createdAt",
             ctpp.order AS "orderNumber",
             ctpp.active AS "active"
      
      FROM customer.customer_third_party_providers ctpp
               INNER JOIN customer.customer_third_party_provider_countries ctppc ON ctpp.customer_third_party_provider_id = ctppc.customer_third_party_provider_id
               INNER JOIN internal.third_party_providers tpp ON ctpp.third_party_provider_id = tpp.third_party_provider_id
               INNER JOIN internal.third_party_provider_types tppt ON tpp.type_id = tppt.third_party_provider_type_id
      WHERE ctpp.customer_id = $1 AND ctpp.is_deleted = FALSE AND ctppc.country_id=$2
      GROUP BY ctpp.customer_third_party_provider_id, tpp.third_party_provider_id, tppt.third_party_provider_type_id, ctppc.customer_provider_countries_id
      ORDER BY ctpp.order`
    },
    create: {
      provider: `INSERT INTO customer.customer_third_party_providers (customer_id, third_party_provider_id, label, config, "order", active)
VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING customer_third_party_provider_id AS "providerId", created_at AS "createdAt";`,
      country: `INSERT INTO customer.customer_third_party_provider_countries(country_id, customer_third_party_provider_id)
SELECT $3, ctpp.customer_third_party_provider_id
FROM customer.customer_third_party_providers ctpp
WHERE ctpp.customer_id = $1 AND ctpp.customer_third_party_provider_id = $2 AND ctpp.is_deleted=FALSE RETURNING customer_provider_countries_id AS "providerCountryId";`,
      countryProviders: `WITH selectCountryProviders AS (
          SELECT (c ->> 0)::INT AS "countryId", (c ->> 1)::INT AS "providerId"
          FROM json_array_elements($2) AS c
      )
      INSERT
      INTO customer.customer_third_party_provider_countries AS ctppc (country_id, customer_third_party_provider_id)
      SELECT "countryId", "providerId"
      FROM selectCountryProviders
               INNER JOIN customer.customer_third_party_providers ctpp ON "providerId" = ctpp.customer_third_party_provider_id
      WHERE ctpp.customer_id = $1
      ON CONFLICT (country_id, customer_third_party_provider_id) DO NOTHING
      RETURNING ctppc.customer_provider_countries_id AS "countryProviderId",
          ctppc.country_id AS "countryId",
          ctppc.customer_third_party_provider_id AS "providerId";`
    },
    update: {
      provider: `UPDATE customer.customer_third_party_providers
SET label=$3, config=$4, "order" = $5, active = $6, updated_at=now()
WHERE customer_id = $1 AND customer_third_party_provider_id = $2 AND is_deleted=FALSE
      RETURNING updated_at AS "updatedAt";`,
    },
    delete: {
      provider: `UPDATE customer.customer_third_party_providers
SET deleted_at = NOW(), is_deleted = TRUE
WHERE customer_id = $1 AND customer_third_party_provider_id = $2 AND is_deleted=FALSE
      RETURNING deleted_at AS "deletedAt", is_deleted AS "isDeleted";`,
      country: `DELETE
FROM customer.customer_third_party_provider_countries
WHERE customer_provider_countries_id = (SELECT ctppc.customer_provider_countries_id
                                        FROM customer.customer_third_party_provider_countries ctppc
                                                 INNER JOIN customer.customer_third_party_providers ctpp
                                                            ON ctppc.customer_third_party_provider_id =
                                                               ctpp.customer_third_party_provider_id
                                        WHERE ctpp.customer_id = $1 AND
                                              ctppc.customer_third_party_provider_id = $2 AND
                                              ctppc.customer_provider_countries_id = $3);`,
      countryProvider: `DELETE
      FROM customer.customer_third_party_provider_countries
      WHERE customer_provider_countries_id =
            (SELECT customer_provider_countries_id
             FROM customer.customer_third_party_provider_countries ctppc
                      INNER JOIN customer.customer_third_party_providers ctpp ON ctppc.customer_third_party_provider_id = ctpp.customer_third_party_provider_id
                WHERE ctpp.customer_id=$1 AND ctppc.customer_provider_countries_id=$2)`
    }
  },
  stripe: {
    products: {
      getDefaultProduct: 'SELECT subscription_product_id AS "subscriptionProductId", customer_id AS "customerId", object_id AS "objectId" FROM payment.subscription_products WHERE customer_id=$1;',
      getProductByCustomerId: 'SELECT p.product_id as "productId", p.customer_id as "customerId", p.token as "token", p.created_at as "createdAt" FROM stripe.products as p INNER JOIN stripe.stripe_customers as sc ON p.customer_id = sc.stripe_customer_id WHERE sc.customer_id = $1;',
      createProduct: 'INSERT INTO stripe.products (token, created_at, updated_at, customer_id) VALUES ($1, NOW(), NOW(), $2) RETURNING product_id AS "productId", customer_id AS "customerId", token AS "token", created_at AS "createdAt";',
      delete: 'DELETE FROM stripe.products WHERE product_id = $1;',
    },
    prices: {
      get: 'SELECT price_id AS "priceId", product_id AS "productId", tier_group_customer_id AS "tierGroupCustomerId", token AS "token", amount AS "amount", created_at AS "createdAt" FROM stripe.prices WHERE price_id = $1;',
      create: 'INSERT INTO stripe.prices (product_id, tier_group_customer_id, token, amount, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING price_id AS "priceId", product_id AS "productId", tier_group_customer_id AS "tierGroupCustomerId", token AS "token", amount AS "amount", created_at AS "createdAt";',
      delete: 'DELETE FROM stripe.prices WHERE price_id = $1;',
    },
    subscriptions: {
      create: 'INSERT INTO stripe.subscriptions (token, customer_id, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING subscription_id AS "subscriptionId", customer_id AS "customerId", token AS "token", created_at AS "createdAt";',
      delete: 'DELETE FROM stripe.subscriptions WHERE subscription_id = $1;',
    },
    subscriptionsItems: {
      get: {
        byCustomerId: 'SELECT si.subscription_item_id AS "subscriptionItemId", si.subscription_id AS "subscriptionId", si.token AS "token", si.price_id AS "priceId", si.created_at AS "createdAt" FROM customer.customers c INNER JOIN stripe.stripe_customers sc ON c.customer_id = sc.customer_id INNER JOIN stripe.subscriptions s ON sc.stripe_customer_id = s.customer_id INNER JOIN stripe.subscription_items si ON si.subscription_id = s.subscription_id WHERE c.customer_id = $1;'
      },
      create: 'INSERT INTO stripe.subscription_items (subscription_id, token, price_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING subscription_item_id AS "subscriptionItemId", subscription_id AS "subscription_id", token AS "token", price_id AS "price_id", created_at AS "created_at"',
      delete: 'DELETE FROM stripe.subscription_items WHERE subscription_item_id = $1;',
    },
    charges: {
      create: 'INSERT INTO stripe.charges (stripe_customer_id, currency, amount, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING stripe_customer_id AS "stripeCustomerId", currency AS "currency", amount AS "amount", created_at AS "createdAt"',
    },
    customers: {
      get: {
        all: 'SELECT stripe_customer_id AS "stripeCustomerId", customer_id AS "customerId", token AS "token", price_id AS "priceId", created_at FROM stripe.stripe_customers',
        byCustomerId: 'SELECT stripe_customer_id AS "stripeCustomerId", customer_id AS "customerId", token AS "token", price_id AS "priceId", created_at AS "createdAt" FROM stripe.stripe_customers WHERE customer_id = $1;',
      },
      create: 'INSERT INTO stripe.stripe_customers (customer_id, token, created_at, updated_at, price_id) VALUES ($1, $2, NOW(), NOW(), $3) RETURNING stripe_customer_id AS "stripeCustomerId", customer_id AS "customerId", token AS "token", created_at AS "createdAt", price_id as "priceId"',
      delete: {
        byStripeCustomerId: 'DELETE FROM stripe.stripe_customers WHERE stripe_customer_id = $1;',
        byCustomerId: 'DELETE FROM stripe.stripe_customers WHERE customer_id = $1;',
      }
    },
    cards: {
      get: {
        byCardIdAndCustomerId: 'SELECT c1.card_id AS "cardId", c1.token AS "cardToken", c1.customer_id AS "customerId", sc.token AS "customerToken", (c1.meta->\'card\')::JSON AS "card", c1.default AS "isDefault" FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id WHERE sc.customer_id=$1 AND c1.card_id=$2;',
      },
      list: {
        byCustomerId: 'SELECT c1.card_id as "cardId", (c1.meta->\'card\')::JSONB AS "card", sc.stripe_customer_id AS "customerId", c1.created_at AS "createdAt", c1.default AS "isDefault" FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id INNER JOIN customer.customers c ON sc.customer_id = c.customer_id WHERE sc.customer_id = $1 AND c.active = TRUE LIMIT $2 OFFSET $3;',
      },
      create: 'INSERT INTO stripe.cards(customer_id, token, meta, created_at, updated_at, "default") VALUES ($1, $2, $3, NOW(), NOW(), $4) RETURNING card_id as "cardId", customer_id AS "customerId", token, created_at AS "createdAt", "default" AS "isDefault";',
      delete: {
        byCardId: 'DELETE FROM stripe.cards WHERE card_id=$1;',
        byCustomerId: 'DELETE FROM stripe.cards WHERE card_id=(SELECT c1.card_id FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id AND sc.customer_id=$1 WHERE c1.card_id=$2);'
      },
      update: {
        setDefault: 'WITH removeDefaults AS (UPDATE stripe.cards SET "default" = FALSE WHERE card_id IN (SELECT c1.card_id FROM stripe.cards c1 INNER JOIN stripe.stripe_customers sc ON c1.customer_id = sc.stripe_customer_id AND sc.customer_id = $1) AND "default" = TRUE) UPDATE stripe.cards SET "default" = TRUE WHERE card_id = (SELECT c2.card_id FROM stripe.cards c2 INNER JOIN stripe.stripe_customers sc ON c2.customer_id = sc.stripe_customer_id AND sc.customer_id = $1 WHERE c2.card_id = $2) AND "default" = FALSE RETURNING card_id AS "cardId";',
      }
    },
    tiers: {
      getByGroupId: 'SELECT tiers.tier_group_id AS "tierGroupId", tiers.up_to_number AS "upToNumber", tiers.amount AS "amount", tiers.created_at AS "createdAt" FROM stripe.tiers INNER JOIN stripe.tier_groups tg on tg.tier_group_id = tiers.tier_group_id WHERE tg.tier_group_id = $1;',
    },
    tierGroups: {
      get: 'SELECT tier_group_id AS "tierGroupId", name AS "name" FROM stripe.tier_groups WHERE tier_group_id = $1;',
    },
    tierGroupCustomers: {
      create: 'INSERT INTO stripe.tier_group_customers (customer_id, tier_group_id) VALUES ($1, $2) RETURNING tier_group_customers AS "tierGroupCustomerId", customer_id AS "stripeCustomerId", tier_group_id AS "tierGroupId";',
      delete: 'DELETE FROM stripe.tier_group_customers WHERE tier_group_customers=$1;',
    },
    invoices: {
      get: 'SELECT invoice_id AS "invoiceId", stripe_customer_id AS "stripeCustomerId", token AS "token", paid AS "paid", total_amount AS "totalAmount", currency AS "currency", created_at AS "createdAt" FROM stripe.invoices WHERE stripe_customer_id = $1 AND EXTRACT(year FROM "created_at") = $2 ORDER BY created_at ASC;',
      create: 'INSERT INTO stripe.invoices (stripe_customer_id, token, paid, total_amount, currency, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING invoice_id AS "invoiceId", stripe_customer_id AS "stripeCustomerId", token AS "token", paid AS "paid", total_amount AS "totalAmount", currency AS "currency", created_at AS "createdAt";',
      update: 'UPDATE stripe.invoices SET paid = $2::BOOLEAN, error_code_id = (SELECT error_codes.error_code_id FROM stripe.error_codes WHERE code = $3::TEXT) WHERE invoice_id = $1::INT RETURNING invoice_id AS "invoiceId", token AS "token", paid AS "paid";',
    },
    invoiceItems: {
      create: 'INSERT INTO stripe.invoice_items (price_id, stripe_customer_id, token, quantity, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING invoice_item_id AS "invoiceItemId", price_id AS "priceId", stripe_customer_id AS "stripeCustomerId", token AS "token", quantity AS "quantity", created_At AS "createdAt"'
    },
    errors: {
      get: `SELECT ec.error_code_id AS "errorId", COALESCE(dc.code, ec.code) AS "code", COALESCE(dc.message, ec.message) AS "message"
            FROM stripe.payment_status ps
              LEFT JOIN stripe.error_codes ec on ec.error_code_id = ps.error_code_id
              LEFT JOIN stripe.decline_codes dc ON ec.decline_code_id = dc.decline_code_id
            WHERE customer_id = $1
            AND paid = false::BOOLEAN;`
    },
    paymentStatus: {
      create: `WITH created AS (
    INSERT INTO stripe.payment_status (paid, error_code_id, customer_id)
        VALUES ($1, (SELECT ec.error_code_id FROM stripe.error_codes ec WHERE ec.code = $2 :: TEXT), $3)
        RETURNING paid, error_code_id, customer_id
)
SELECT created.paid AS "paid", created.customer_id AS "customerId", COALESCE(dc.message, ec.message) AS "errorMessage"
FROM created
         LEFT JOIN stripe.error_codes ec ON ec.error_code_id = created.error_code_id
         LEFT JOIN stripe.decline_codes dc ON dc.decline_code_id = ec.decline_code_id`,
      update: `WITH updated AS (
                  UPDATE stripe.payment_status
                    SET paid = $1,
                    error_code_id = (SELECT ec.error_code_id FROM stripe.error_codes ec WHERE ec.code = $2 :: TEXT),
                    updated_at = now()
              WHERE customer_id = $3
              RETURNING paid, error_code_id, customer_id)
              SELECT updated.paid AS "paid", updated.customer_id AS "customerId", COALESCE(dc.message, ec.message) AS "errorMessage"
              FROM updated
              LEFT JOIN stripe.error_codes ec ON ec.error_code_id = updated.error_code_id
              LEFT JOIN stripe.decline_codes dc ON dc.decline_code_id = ec.decline_code_id`,
      get: 'SELECT ps.payment_status_id FROM stripe.payment_status ps WHERE customer_id = $1 AND paid = false;'
    }
  },
};

sqlQueries.services = serviceQueries;
sqlQueries.usersV2 = usersV2;

module.exports = sqlQueries;

