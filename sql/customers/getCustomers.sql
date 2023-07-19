SELECT c.customer_id AS "customerId",
       c.name,
       c.prefix,
       c.currency,
       c.internal_currency AS "internaCurrency",
       c.customer_business_number AS "businessNumber",
       c.customer_package_id AS "packageId"
FROM customer.customers c
WHERE c.active = TRUE
ORDER BY c.customer_id ASC;
