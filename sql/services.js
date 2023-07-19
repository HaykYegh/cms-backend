const servicesList = `SELECT s.service_id AS "serviceId", s.label, s.nickname, s.created_at AS "createdAt",
       json_build_object('statusId', ss.service_status_id, 'name', ss.name) AS status,
       json_build_object('typeId', st.service_type_id, 'name', st.name) AS type
FROM virtual_network.services s
         INNER JOIN virtual_network.service_types st ON s.service_type_id = st.service_type_id
         INNER JOIN virtual_network.service_statuses ss ON s.service_status_id = ss.service_status_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
WHERE n.customer_id = $1 AND n.network_id = $2
ORDER BY s.service_id DESC
LIMIT $3
OFFSET $4;`;

const invitesList = `SELECT si.service_invite_id AS "inviteId",
       si.invitee,
       si.created_at AS "createdAt",
       si.token,
       json_build_object('adminId', a.administrator_id, 'email', a.email) AS "admin",
       json_build_object('serviceId', s.service_id, 'nickname', s.nickname, 'label', s.label) AS service
FROM virtual_network.service_invites si
         INNER JOIN virtual_network.services s ON si.service_id = s.service_id
         INNER JOIN dashboard.administrators a ON si.invitor_id = a.administrator_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
WHERE s.service_status_id = 1 AND ns.network_id=$1 AND s.service_id = $2 ORDER BY service_invite_id DESC LIMIT $3 OFFSET $4;`;


const usersList = `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id)
SELECT u.user_id AS "userId",
       REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') AS number,
       u.email,
       u.created_at AS "createdAt",
       u.user_country_id AS "countryId",
       coalesce(ua1.value, '') AS "firstName",
       coalesce(ua2.value, '') AS "lastName",
       ca.sort_name AS "regionCode",
       ca.name AS "countryName"


FROM virtual_network.service_users su

         INNER JOIN virtual_network.services s ON su.service_id = s.service_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
         INNER JOIN backend.users u ON su.user_id = u.user_id

         LEFT JOIN internal.countries ca ON u.user_country_id = ca.country_id
         LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id


WHERE n.status_id = 1 AND s.service_status_id = 1 AND n.customer_id = $1 AND ns.network_id = $2 AND
      su.service_id = $3 AND (($4::DATE IS NULL AND $5::DATE IS NULL) OR
                              ($4::DATE IS NOT NULL AND $5::DATE IS NOT NULL AND
                               su.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($8::TEXT IS NULL OR REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') LIKE $8 || '%')
ORDER BY u.user_id DESC
LIMIT $9
    OFFSET $10;`;


const usersCount = `WITH getUserDevices AS (SELECT ud1.user_id AS user_id, count(ud1.platform_id) AS "count"
                        FROM backend.user_devices ud1
                                 INNER JOIN backend.users u ON ud1.user_id = u.user_id
                        WHERE u.customer_id = $1::INT AND ud1.platform_id = $7::INT
                        GROUP BY ud1.user_id)
SELECT count(1) AS count FROM virtual_network.service_users su

         INNER JOIN virtual_network.services s ON su.service_id = s.service_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
         INNER JOIN backend.users u ON su.user_id = u.user_id

         LEFT JOIN internal.countries ca ON u.user_country_id = ca.country_id
         LEFT JOIN backend.user_attributes ua1 ON u.user_id = ua1.user_id AND ua1.attribute_id = 2
         LEFT JOIN backend.user_attributes ua2 ON u.user_id = ua2.user_id AND ua2.attribute_id = 3
         LEFT JOIN getUserDevices ud ON u.user_id = ud.user_id


WHERE n.status_id = 1 AND s.service_status_id = 1 AND n.customer_id = $1 AND ns.network_id = $2 AND
      su.service_id = $3 AND (($4::DATE IS NULL AND $5::DATE IS NULL) OR
                              ($4::DATE IS NOT NULL AND $5::DATE IS NOT NULL AND
                               su.created_at :: DATE BETWEEN $4 :: DATE AND $5 :: DATE)) AND
      ($6::INT IS NULL OR ($6 IS NOT NULL AND u.user_country_id = $6::INT)) AND
      ($7::INT IS NULL OR ($7 IS NOT NULL AND ud.count > 0)) AND
      ($8::TEXT IS NULL OR REGEXP_REPLACE(u.username, '[[:alpha:]]', '', 'g') LIKE $8 || '%')`;


const userDelete = `DELETE
FROM virtual_network.service_users AS su1 USING (SELECT su.service_user_id, u.username, u.user_id
                                                 FROM virtual_network.service_users su
                                                          INNER JOIN backend.users u ON su.user_id = u.user_id
                                                          INNER JOIN virtual_network.services s ON su.service_id = s.service_id
                                                          INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
                                                          INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id


                                                 WHERE u.status = 1 AND n.status_id = 1 AND s.service_status_id = 1 AND
                                                       n.customer_id = $1 AND
                                                       ns.network_id = $2 AND
                                                       su.service_id = $3 AND u.user_id = $4) u
WHERE su1.user_id = u.user_id RETURNING u.username;`;

module.exports = {
  list: {
    services: servicesList,
    invites: invitesList,
    users: usersList
  },
  count: {
    services: `SELECT CAST(count(1) AS INT) AS count
FROM virtual_network.services s
         INNER JOIN virtual_network.service_types st ON s.service_type_id = st.service_type_id
         INNER JOIN virtual_network.service_statuses ss ON s.service_status_id = ss.service_status_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
WHERE n.customer_id = $1 AND n.network_id = $2`,
    invites: `SELECT CAST(count(1) AS INT) AS count
FROM virtual_network.service_invites si
         INNER JOIN virtual_network.services s ON si.service_id = s.service_id
         INNER JOIN dashboard.administrators a ON si.invitor_id = a.administrator_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
WHERE s.service_status_id = 1 AND ns.network_id = $1 AND s.service_id = $2;`,
    users: usersCount
  },
  create: {
    service: '',
    invites: `WITH getService AS (
    SELECT s.service_id, s.label,
           json_build_object('serviceId', s.service_id, 'nickname', s.nickname, 'label', s.label) AS service,
           json_build_object('networkId', n.network_id, 'nickname', n.nickname, 'label', n.label) AS network
    FROM virtual_network.network_services ns
             INNER JOIN virtual_network.services s ON ns.service_id = s.service_id
             INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
    WHERE n.customer_id=$1 AND ns.network_id = $2 AND s.service_id = $3
)
INSERT
INTO virtual_network.service_invites(service_id,
                                     invitor_id,
                                     invitee,
                                     invite_type_id,
                                     created_at,
                                     updated_at,
                                     token)
SELECT (SELECT service_id FROM getService), $4, inv, 1,
       now(), now(), uuid_generate_v4()
FROM json_array_elements_text($5 :: JSON) inv
ON CONFLICT (service_id, invitee) DO UPDATE SET token=uuid_generate_v4(),
                                                updated_at=NOW()
                                                RETURNING service_invite_id AS "inviteId",
                                                    created_at AS "createdAt",
                                                    token,
                                                    invitee,
                                                        (SELECT service FROM getService) AS service,
                                                        (SELECT network FROM getService) AS network`,
  },
  delete: {
    user: userDelete
  },
  retrieve: {
    serviceByNicknameOrToken: `SELECT s.service_id AS "serviceId", s.label, s.nickname, s.description, s.created_at AS "createdAt",
       json_build_object('statusId', ss.service_status_id, 'name', ss.name) AS status,
       json_build_object('typeId', st.service_type_id, 'name', st.name) AS type
FROM virtual_network.services s
         INNER JOIN virtual_network.service_types st ON s.service_type_id = st.service_type_id
         INNER JOIN virtual_network.service_statuses ss ON s.service_status_id = ss.service_status_id
         INNER JOIN virtual_network.network_services ns ON s.service_id = ns.service_id
         INNER JOIN virtual_network.networks n ON ns.network_id = n.network_id
         LEFT JOIN virtual_network.service_invites si ON s.service_id = si.service_id
WHERE n.customer_id = $1 AND s.nickname = $2::TEXT OR si.token = $2::TEXT AND s.service_status_id = 1 AND n.status_id = 1;`
  }
};
