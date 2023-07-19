DELETE
FROM customer.customer_third_party_provider_countries
WHERE customer_provider_countries_id=$3 AND customer_provider_countries_id IN (SELECT customer_provider_countries_id
                                                                                  FROM customer.customer_third_party_provider_countries ctppc
                                                                                         INNER JOIN customer.customer_third_party_providers ctpp
                                                                                           ON ctppc.customer_third_party_provider_id =
                                                                                              ctpp.customer_third_party_provider_id
                                                                                  WHERE customer_id = $1 AND
                                                                                          ctpp.customer_third_party_provider_id = $2);
