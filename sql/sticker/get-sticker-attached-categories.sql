SELECT pcm.package_id, pc.name, pcm.category_id
FROM sticker.package_category_map pcm
       INNER JOIN sticker.package_categories pc ON pcm.category_id = pc.package_category_id
WHERE pcm.package_id = $2 AND pc.customer_id = $1;
