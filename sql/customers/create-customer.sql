INSERT INTO customer.customers (customer_package_id,
                                customer_status,
                                name,
                                customer_country_id,
                                prefix,
                                currency,
                                active,
                                internal_currency,
                                customer_business_number,
                                trial_end)
VALUES ($1, 1, $2,
        (SELECT country_id FROM internal.countries WHERE sort_name = $3),
        $4, $5, TRUE, $5, $6, NOW() + INTERVAL '1 days' * $7)
RETURNING customer_id AS "customerId", name AS "name", prefix AS "prefix", currency AS "currency", internal_currency AS "internalCurrency", customer_business_number AS "businessNumber", customer_package_id AS "packageId";
