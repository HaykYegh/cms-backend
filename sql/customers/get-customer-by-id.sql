SELECT
  c.customer_id,
  c.customer_package_id,
  c.customer_status,
  c.customer_country_id,
  c.name,
  c.prefix,
  c.currency,
  c2.name as country_name
FROM customer.customers c
LEFT JOIN internal.countries c2 ON c.customer_country_id = c2.country_id
where c.customer_id=$1
