UPDATE customer.customer_third_party_providers
SET active = $3
WHERE customer_third_party_provider_id = $2 AND customer_id = $1 RETURNING active;