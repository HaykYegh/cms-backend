UPDATE customer.customer_third_party_providers
  SET "order" = $4, active = $3, updated_at=now(), config=$5
  WHERE customer_id = $1 AND customer_third_party_provider_id = $2
  RETURNING customer_third_party_provider_id as "customerThirdPartyProviderId", config;
