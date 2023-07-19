UPDATE customer.customers
SET customer_package_id = $1, customer_status = $2, name = $3, prefix = $4, currency = $5, customer_country_id=$6 WHERE customer_id=$7
