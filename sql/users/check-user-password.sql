SELECT u.user_id AS "userId",
       u.username
FROM backend.users u
WHERE u.customer_id = $1 AND u.user_id = $2 AND u.password = crypt($3, u.password);
