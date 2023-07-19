SELECT p.package_id,
       CAST(p.package AS INTEGER) AS package_code,
       p.label AS name,
       p.config AS config,
       json_agg(json_build_object('category_id', pcm.category_id)) as categories
FROM sticker.packages p
       LEFT JOIN sticker.package_countries pc ON pc.package_id = p.package_id
--        INNER JOIN internal.countries c2 ON c2.country_id = pc.country_id
       INNER JOIN sticker.package_category_map pcm ON p.package_id = pcm.package_id
       INNER JOIN sticker.package_categories pcat ON pcm.category_id = pcat.package_category_id AND pcat.customer_id=p.customer_id

WHERE p.customer_id = $1 AND (p.package_id = $2 OR p.package = $2)
GROUP BY p.package_id, pcm.category_id;