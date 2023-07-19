SELECT

  administrator_id,
  email,
  created_at as createdAt

FROM dashboard.administrators WHERE administrator_id=$2 AND status=1 and customer_id=$1