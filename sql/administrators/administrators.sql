SELECT

  "administrator_id",
  "email",
  "created_at"

FROM dashboard.administrators WHERE "status"=1 AND customer_id=$1