SELECT m.message_id as "messageId",
       m.message_status_id as "messageStatusId",
       ms.name as "messageStatus",
       m.title,
       m.content
FROM notification.messages m
INNER JOIN notification.message_statuses ms ON m.message_status_id = ms.message_status_id
WHERE m.customer_id=$1 AND m.message_status_id=1 ORDER BY "messageId" LIMIT $2 OFFSET $3;