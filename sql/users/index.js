module.exports = {
  list: {
    groups: `SELECT ug.user_group_id AS "userGroupId",
       ug.name AS "name",
       ug.created_at AS "createdAt"
FROM backend.user_groups ug
WHERE ug.customer_id = $1 AND ($2::TEXT IS NULL OR lower(ug.name) LIKE lower($2 || '%'))
ORDER BY ug.user_group_id DESC
LIMIT $3
    OFFSET $4;`,
    members: `SELECT ugm.user_group_member_id AS "memberId",
           ugm.user_group_id AS "groupId",
           u.user_id AS "userId",
           REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
           u.email
    FROM backend.users u
             LEFT JOIN backend.user_group_members ugm ON u.user_id = ugm.user_id
             LEFT JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
    WHERE u.customer_id = $1 AND ($2::INT IS NULL OR ugm.user_group_id = $2::INT)
LIMIT $3 OFFSET $4`,
    userGroups: `SELECT ug.user_group_id AS "userGroupId",
       ug.name AS "name",
       ug.created_at AS "createdAt"
FROM backend.user_groups ug
         INNER JOIN backend.user_group_members ugm ON ug.user_group_id = ugm.user_group_id

WHERE ug.customer_id = $1 AND ugm.user_id = $2
ORDER BY ug.user_group_id DESC
LIMIT $3
OFFSET $4;`,
    membersNumbers: `SELECT REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number
    FROM backend.users u
             LEFT JOIN backend.user_group_members ug ON u.user_id = ug.user_id
    WHERE u.customer_id = $1
              AND ($2::INT IS NULL AND ug.user_group_id IS NULL) OR ($2::INT IS NOT NULL AND ug.user_group_id = $2);`
  },
  retrieve: {
    group: `SELECT ug.user_group_id AS "userGroupId",
       ug.name AS "name",
       ug.created_at AS "createdAt"
FROM backend.user_groups ug
WHERE ug.customer_id = $1 AND ug.user_group_id=$2`,
    member: `SELECT ugm.user_group_member_id AS "memberId",
       ugm.user_group_id AS "groupId",
       ugm.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.email
FROM backend.user_group_members ugm
         INNER JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         INNER JOIN backend.users u ON ugm.user_id = u.user_id
WHERE ug.customer_id = $1 AND ugm.user_group_id = $2 AND ugm.user_group_member_id=$3`
  },
  count: {
    groups: `SELECT count(1) AS count
FROM backend.user_groups ug
WHERE ug.customer_id = $1 AND ($2::TEXT IS NULL OR lower(ug.name) LIKE lower($2 || '%'));`,
    members: `SELECT count(1) AS count
FROM backend.user_group_members ugm
         INNER JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
         INNER JOIN backend.users u ON ugm.user_id = u.user_id
WHERE ug.customer_id = $1 AND ugm.user_group_id = $2`
  },
  create: {
    group: `INSERT INTO backend.user_groups AS ug (customer_id, name)
VALUES ($1, $2) RETURNING ug.user_group_id AS "userGroupId",
                ug.name AS "name",
                ug.created_at AS "createdAt";`,
    members: `WITH query AS (INSERT
    INTO backend.user_group_members AS ugm(user_group_id, user_id)
        SELECT $1::INT, us.user_id
        FROM backend.users us
        WHERE us.username IN (SELECT u
                              FROM json_array_elements_text($2::JSON) u)
        ON CONFLICT (user_id)
            DO UPDATE SET user_group_id = $1::INT RETURNING ugm.user_group_member_id AS "memberId",
        ugm.user_group_id AS "groupId",
        ugm.user_id AS "userId")
SELECT q."memberId" AS "memberId",
       q."groupId" AS "groupId",
       q."userId" AS "userId",
       REGEXP_REPLACE(u2.username, '[[:alpha:]]', '', 'g') AS number
FROM query q
         INNER JOIN backend.users u2 ON q."userId" = u2.user_id;`
  },
  update: {
    group: `UPDATE backend.user_groups AS ug
SET name=$3, updated_at=NOW()
WHERE ug.customer_id = $1 AND ug.user_group_id = $2 RETURNING ug.user_group_id AS "userGroupId",
    ug.name AS "name",
    ug.created_at AS "createdAt";`,
    stats: 'SELECT metrics."updateUserStats"($1, $2, $3, $4, $5, $6, $7, $8, $9) AS "userStats";'
  },
  delete: {
    group: 'DELETE FROM backend.user_groups WHERE customer_id=$1 AND user_group_id=$2;',
    member: `DELETE
FROM backend.user_group_members
WHERE user_group_member_id = (SELECT ugm.user_group_member_id
                              FROM backend.user_group_members ugm
                                       INNER JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
                              WHERE ug.customer_id = $1 AND ug.user_group_id = 
                                                            $2 AND
                                    ugm.user_group_member_id = $3) RETURNING user_group_member_id AS "memberId";`,
    members: `DELETE
    FROM backend.user_group_members
    WHERE user_group_member_id IN (SELECT ugm.user_group_member_id
                                   FROM backend.user_group_members ugm
                                            INNER JOIN backend.user_groups ug ON ugm.user_group_id = ug.user_group_id
                                            INNER JOIN backend.users u ON ugm.user_id = u.user_id
                                   WHERE ug.customer_id = $1 AND
                                         u.username IN (SELECT k FROM json_array_elements_text($2::JSON) k))
    RETURNING user_group_member_id AS "memberId";`,
  }
};
