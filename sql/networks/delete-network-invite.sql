DELETE
FROM virtual_network.network_invites
WHERE network_invite_id = (SELECT ni.network_invite_id FROM virtual_network.network_invites ni
                                           INNER JOIN virtual_network.networks n ON ni.network_id = n.network_id
                        WHERE n.customer_id=$1 AND ni.network_invite_id=$2 AND n.network_id=$3);