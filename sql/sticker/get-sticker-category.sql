SELECT package_category_id, name, active FROM sticker.package_categories WHERE package_category_id=$2 AND customer_id=$1;
