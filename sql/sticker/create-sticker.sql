WITH getLastSticker AS (SELECT package_id, package
                        FROM sticker.packages
                        WHERE package IS NOT NULL
                        ORDER BY package_id DESC
                        LIMIT 1)
INSERT INTO sticker.packages(package_status_id, package, label, note, order_number, copyright, customer_id)
VALUES (4, (SELECT package::INT+1 FROM getLastSticker), $2, $3, $4, $5, $1) RETURNING package_id, package as package_number
, created_at, customer_id;
