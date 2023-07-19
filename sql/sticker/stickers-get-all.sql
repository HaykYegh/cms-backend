SELECT DISTINCT p.package_id,
                CAST(p.package AS INTEGER) AS package_code,
                coalesce(pl.title, 'Sticker #'|| p.package) AS name,
                coalesce(pl.description, 'Sticker #'|| p.package || ' description') AS description,
                p.config AS config
FROM sticker.packages p
       INNER JOIN sticker.package_countries pc ON pc.package_id = p.package_id
       INNER JOIN internal.countries c2 ON c2.country_id = pc.country_id
       INNER JOIN sticker.package_category_map pcm ON p.package_id = pcm.package_id
       INNER JOIN sticker.package_platforms pp ON p.package_id = pp.package_id
       LEFT JOIN sticker.package_languages pl ON p.package_id = pl.package_id

WHERE p.customer_id = $1 AND p.package_status_id=3 AND ($2::INTEGER IS NULL OR pcm.category_id=$2) AND ($3::INTEGER is NULL OR c2.country_id = $3)
AND ($4 :: INTEGER IS NULL OR pp.platform_id = $4)

LIMIT $5 OFFSET $6;