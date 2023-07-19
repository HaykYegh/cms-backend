UPDATE sticker.package_categories SET name=$3, active=$4 WHERE package_category_id=$2 AND customer_id=$1;
