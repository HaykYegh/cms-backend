UPDATE sticker.packages SET coords=$3 WHERE customer_id=$1 AND package_id=$2 RETURNING package_id;
