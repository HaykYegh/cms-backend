UPDATE sticker.packages
SET label = $3, note = $4, copyright = $5, order_number = $6
WHERE customer_id = $1 AND
        package_id = $2 RETURNING package_id, package AS package_number, package_status_id, created_at, customer_id, order_number;