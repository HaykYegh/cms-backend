SELECT count(DISTINCT ua.username) AS count,
       c.country_id,
       c.name
FROM backend.user_attempts ua FULL
       OUTER JOIN backend.users u USING (username)
       INNER JOIN internal.countries c ON c.sort_name = ua.region_code
WHERE ua.last_attempt_at::DATE BETWEEN $1 :: DATE AND $2 :: DATE AND
        u.username IS NULL AND ua.customer_id=$3
GROUP BY c.country_id
ORDER BY count DESC;
