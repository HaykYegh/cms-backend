SELECT
  ctpp.customer_third_party_provider_id AS "customerThirdPartyProviderId",
  ctpp.created_at as "createdAt",
  tpp.third_party_provider_id as "providerId",
  tpp.type_id as "providerTypeId",
  tpp.key as "key",
  ctpp.order as "order",
  ctpp.active as "active",
  ctpp.config as "config"



FROM customer.customer_third_party_providers ctpp
  INNER JOIN internal.third_party_providers tpp ON ctpp.third_party_provider_id = tpp.third_party_provider_id
WHERE ctpp.customer_id = $1 AND ctpp.is_deleted=FALSE
GROUP BY ctpp.customer_third_party_provider_id, tpp.third_party_provider_id
ORDER BY ctpp.order ASC
LIMIT $2 OFFSET $3 ;