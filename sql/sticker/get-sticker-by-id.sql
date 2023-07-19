SELECT p.package_id,
       p.package_status_id,
       p.package as package_number,
       p.label as name,
       p.note as note,
       p.order_number,
       p.copyright,
       p.created_at,
       p.coords,
       p.customer_id

FROM sticker.packages p
WHERE p.customer_id = $1 AND p.package_id=$2