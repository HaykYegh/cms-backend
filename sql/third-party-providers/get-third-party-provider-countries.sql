SELECT ctppc.customer_provider_countries_id AS "customerProviderCountryId",
       ctppc.country_id AS "countryId",
       c2.sort_name AS "regionCode",
       c2.name AS "countryName"
FROM customer.customer_third_party_provider_countries ctppc
       INNER JOIN customer.customer_third_party_providers ctpp
         ON ctppc.customer_third_party_provider_id = ctpp.customer_third_party_provider_id
       INNER JOIN internal.countries c2 ON ctppc.country_id = c2.country_id
WHERE ctpp.customer_id = $1 AND ctppc.customer_third_party_provider_id = $2
ORDER BY "customerProviderCountryId" DESC
LIMIT $3
OFFSET $4;