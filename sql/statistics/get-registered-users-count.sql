SELECT count(1) AS count, u.created_at :: DATE AS "createdAt"
FROM backend.users u
WHERE u.customer_id = $1 AND u.created_at :: DATE BETWEEN $2::DATE AND $3::DATE
GROUP BY 2;