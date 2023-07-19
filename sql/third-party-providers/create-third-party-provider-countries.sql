INSERT INTO customer.customer_third_party_provider_countries(country_id, customer_third_party_provider_id)
SELECT DISTINCT c2.country_id, customer_third_party_provider_id
FROM customer.customer_third_party_providers ctpp
       LEFT JOIN internal.countries c2 ON c2.sort_name IN (SELECT regionCode
                                                           FROM json_array_elements_text($3) regionCode)
WHERE ctpp.customer_id = $1 AND ctpp.customer_third_party_provider_id = $2
ON CONFLICT DO NOTHING
    RETURNING customer_provider_countries_id AS "customerProviderCountryId",  country_id AS "countryId";

