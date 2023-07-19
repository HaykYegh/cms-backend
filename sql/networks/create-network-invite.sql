INSERT INTO virtual_network.network_invites(network_id,
                                            invitor_id,
                                            invitee,
                                            invite_type_id,
                                            created_at,
                                            updated_at,
                                            token)
SELECT $1, $2, inv, 1, now(), now(), uuid_generate_v4()
FROM json_array_elements_text($3 :: JSON) inv

    ON CONFLICT (network_id, invitee) DO UPDATE SET updated_at=now()
    RETURNING
      network_invite_id AS "networkInviteId",
      network_id AS "networkId",
      invitor_id AS "invitorId",
      invitee AS "invitee",
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      token AS "token";