SELECT c2."country_id", c2.name AS label,
       c2."country_id" AS value,
       c2.phone_code, c2.sort_name AS region_code, c2.currency,
       tc.timeline_country_id as "regionId"
FROM internal.countries c2
LEFT JOIN metrics.timeline_countries tc ON c2.sort_name=tc.region_code
ORDER BY "country_id"