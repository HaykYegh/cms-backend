SELECT "package_category_id", name FROM sticker."package_categories" WHERE active=TRUE AND customer_id=$1;
