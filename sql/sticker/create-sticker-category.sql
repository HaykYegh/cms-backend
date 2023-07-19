INSERT INTO sticker.package_categories (customer_id, name, active) VALUES ($1,$2,$3) RETURNING package_category_id;
