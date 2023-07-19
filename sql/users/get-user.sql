SELECT u.user_id AS "userId",
       u.username
FROM backend.users u
WHERE u.customer_id = $1 AND u.username = $2;