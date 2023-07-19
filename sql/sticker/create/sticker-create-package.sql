INSERT INTO sticker.packages(package_status_id,
                             package,
                             label,
                             note,
                             order_number,
                             copyright,
                             customer_id,
                             count,
                             config)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING package_id;