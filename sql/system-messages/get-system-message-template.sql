SELECT m.message_id AS "messageId",
       m.title,
       m.content,
       JSON_AGG(JSON_BUILD_OBJECT(
                  'messageActivityId', ma.message_activity_id,
                  'messageActivityConfig', ma.config,
                  'createdAt', ma.created_at,
                  'messageActivityType',
                  JSON_BUILD_OBJECT('messageActivityTypeId', mat.message_activity_type_id, 'name', mat.name),
                  'messageActivityAdmin', JSON_BUILD_OBJECT('adminId', a.administrator_id, 'email', a.email)
                    )) AS activity,
       JSON_BUILD_OBJECT(
                  'messageStatusId', ms.message_status_id,
                  'name', ms.name
                    ) AS "messageStatus"

FROM notification.messages m
       INNER JOIN notification.message_statuses ms ON m.message_status_id = ms.message_status_id
       LEFT JOIN notification.message_activities ma ON m.message_id = ma.message_id
       LEFT JOIN dashboard.administrators a ON a.administrator_id = ma.administrator_id
       LEFT JOIN notification.message_activity_types mat ON ma.activity_type_id = mat.message_activity_type_id
WHERE m.customer_id = $1 AND m.message_id = $2 AND m.message_status_id=1
GROUP BY "messageId", ms.message_status_id;