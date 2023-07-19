SELECT p.package_id,
       p.package_status_id,
       p.package_status_id as status,
       p.package,
       p.label,
       p.note,
       p.order_number,
       p.copyright,
--       json_agg(
--         json_build_object('package_category_id', pcm.package_category_id, 'category_id', pcm.category_id,  'category_name', pc.name)) AS categories,
--
--       json_agg(
--         json_build_object('package_platform_id', pl.package_platform_id, 'platform_id', pl.platform_id,
--                                  'platform_name', p2.name)) AS platforms,
       p.created_at

FROM sticker.packages p
--       LEFT JOIN sticker.package_category_map pcm ON p.package_id = pcm.package_id
--       LEFT JOIN sticker.package_categories pc
--         ON pcm.category_id = pc.package_category_id AND pc.customer_id = p.customer_id
--       LEFT JOIN sticker.package_platforms pl ON p.package_id = pl.package_id
--       LEFT JOIN internal.platforms p2 ON pl.platform_id = p2.platform_id
WHERE p.customer_id = $1 AND package_status_id NOT IN (1)
GROUP BY p.package_id
ORDER BY p.order_number ASC
LIMIT $2 OFFSET $3;

