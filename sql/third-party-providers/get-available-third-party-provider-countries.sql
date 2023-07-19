SELECT json_agg(ctppc.country_id) AS "countryIds"
FROM customer.customer_third_party_provider_countries ctppc
       INNER JOIN customer.customer_third_party_providers ctpp
         ON ctppc.customer_third_party_provider_id = ctpp.customer_third_party_provider_id
WHERE ctpp.customer_id = $1 AND ctppc.customer_third_party_provider_id = $2;