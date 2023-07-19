SELECT
  tpp.third_party_provider_id as "thirdPartyProviderId",
  tpp.name,
  tpp.active,
  tpp.type_id as "typeId",
  tpp.config as "config"

FROM internal.third_party_providers tpp
GROUP BY tpp.third_party_provider_id;