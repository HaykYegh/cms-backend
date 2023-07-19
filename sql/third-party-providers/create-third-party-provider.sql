INSERT INTO customer.customer_third_party_providers (customer_id, active, third_party_provider_id, "order", config)
VALUES ($1, $2, $3, $4, $5)
RETURNING customer_third_party_provider_id as "customerThirdPartyProviderId", config;
