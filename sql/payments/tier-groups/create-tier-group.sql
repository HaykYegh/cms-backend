INSERT INTO stripe.tier_groups(name)
VALUES ($1::TEXT) RETURNING tier_group_id AS "tierGroupId";