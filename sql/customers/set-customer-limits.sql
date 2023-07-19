INSERT INTO customer.signin_attempts_limits(customer_id, daily_limit, total_limit)
VALUES ($1, $2, $3) RETURNING daily_limit AS "dailyLimit", total_limit AS "totalLimit";