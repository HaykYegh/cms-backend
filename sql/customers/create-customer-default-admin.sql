INSERT INTO dashboard.administrators (customer_id, "email", "password", "updated_at", status)
    VALUES
      ($1, LOWER($2), crypt($3, gen_salt('bf', 8)), NOW(), 1)
    RETURNING administrator_id AS "administratorId", email, created_at AS "createdAt";