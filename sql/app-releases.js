const appReleasesList = `SELECT ar.app_release_id AS "appReleaseId",
       ar.platform_id AS "platformId",
       ar.version,
       ar.created_at AS "createdAt"
FROM internal.app_releases ar
WHERE ar.customer_id=$1
ORDER BY ar.app_release_id DESC
LIMIT $2
OFFSET $3;`;

const appReleasesCount = `SELECT count(1) AS count
FROM internal.app_releases ar
WHERE ar.customer_id = $1;`;

const appReleaseCreate = `INSERT INTO internal.app_releases (customer_id, platform_id, version)
VALUES ($1, $2, $3)
RETURNING app_release_id AS "appReleaseId";`;
const appReleaseDelete = 'DELETE FROM internal.app_releases WHERE customer_id=$1 AND app_release_id=$2;';

const appReleaseUpdate = `UPDATE internal.app_releases
SET platform_id=$3, version=$4, updated_at=now()
WHERE customer_id = $1 AND app_release_id = $2
RETURNING updated_at AS "updatedAt";`;

const appReleaseRetrieve = `SELECT ar.app_release_id AS "appReleaseId",
       ar.platform_id AS "platformId",
       ar.version,
       ar.created_at AS "createdAt",
       CASE WHEN arl IS NOT NULL
                THEN json_build_object(
                   'languageId', arl.lang_id,
                   'title', arl.title,
                   'description', arl.description
               )
            ELSE NULL END AS "language"
FROM internal.app_releases ar
         LEFT JOIN internal.app_release_langs arl ON ar.app_release_id = arl.app_release_id
WHERE ar.customer_id=$1 AND ar.app_release_id=$2;`;


const appReleaseLangUpsert = `INSERT INTO internal.app_release_langs (app_release_id, lang_id, title, description)
SELECT ar.app_release_id, $3::INT, $4::TEXT, $5::TEXT
FROM internal.app_releases ar
WHERE ar.customer_id = $1 AND app_release_id = $2
ON CONFLICT (app_release_id, lang_id) DO UPDATE SET title=$4, description=$5
RETURNING app_release_lang_id AS "appReleaseLangId";`;

const appReleaseLangRetrieve = `SELECT arl.app_release_lang_id AS "appReleaseLangId",
       arl.app_release_id AS "appReleaseId",
       arl.lang_id AS "langId",
       arl.title,
       arl.description
FROM internal.app_release_langs arl
         INNER JOIN internal.app_releases ar ON arl.app_release_id = ar.app_release_id
WHERE ar.customer_id = $1 AND arl.app_release_id = $2 AND arl.lang_id = $3`;

const broadcastCreate = `SELECT u.username AS "username",
       ud.device_token AS "deviceToken"
FROM backend.users u
         INNER JOIN backend.user_devices ud ON u.user_id = ud.user_id
         INNER JOIN internal.app_releases ar ON ud.platform_id = ar.platform_id
WHERE u.customer_id = $1 AND ar.app_release_id = $2;`;


module.exports = {
  list: {
    appReleases: appReleasesList
  },
  count: {
    appReleases: appReleasesCount
  },
  create: {
    appRelease: appReleaseCreate,
    broadcast: broadcastCreate
  },
  delete: {
    appRelease: appReleaseDelete,
  },
  update: {
    appRelease: appReleaseUpdate
  },
  upsert: {
    appReleaseLang: appReleaseLangUpsert
  },
  retrieve: {
    appRelease: appReleaseRetrieve,
    appReleaseLang: appReleaseLangRetrieve
  }
};
