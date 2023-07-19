DELETE
FROM sticker.package_languages pl
WHERE package_id = $2 AND language_id=$3 AND package_id = (SELECT package_id
                                        FROM sticker.packages sp
                                        WHERE sp.customer_id = $1 AND sp.package_id = pl.package_id);