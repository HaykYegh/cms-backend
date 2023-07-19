SELECT pl.package_language_id,
       pl.package_id,
       pl.language_id,
       pl.title,
       pl.introduction,
       pl.description,
       pl.tags,
       l.value as language

FROM sticker.package_languages pl
       INNER JOIN sticker.packages p ON pl.package_id = p.package_id
       INNER JOIN internal.languages l ON pl.language_id = l.language_id
WHERE p.customer_id = $1 AND pl.package_id = $2  AND ($3 :: INT IS NULL OR pl.language_id = $3::INT);