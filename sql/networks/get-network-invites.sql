SELECT ni.network_invite_id AS "networkInviteId",
       ni.network_id AS "networkId",
       ni.invitee AS "invitee",
       ni.created_at AS "createdAt",
       ni.updated_at AS "updatedAt",
       ni.token AS "token",
       ni.invitor_id AS "invitorId",
       a.email AS "invitor"
FROM virtual_network.network_invites ni
       INNER JOIN dashboard.administrators a ON ni.invitor_id = a.administrator_id
WHERE ni.network_id = $1
LIMIT $2
OFFSET $3;