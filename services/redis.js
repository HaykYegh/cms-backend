const config = require('config');
const { promisify } = require('util');
const Redis = require('ioredis');

let isClusterEnabled = false;


if (config.has('redis.isClusterEnabled')) {
  isClusterEnabled = config.get('redis.isClusterEnabled');
}

let redis;
if (isClusterEnabled) {
  const clusterNodes = config.get('redis.nodes');
  redis = new Redis.Cluster(clusterNodes);
  console.log(redis);
} else {
  redis = new Redis(config.get('redis.port'), config.get('redis.host'));
}


redis.on('error', (err) => {
  console.log(`Error ${err}`);
});

const CONSTANTS = {
  HASH: {
    CURRENCIES: 'application#currencies',
    USERS: 'userConfig',
    BILLING: 'application#billing',
    CALL_PRICES: 'application#call#prices',
    THIRD_PARTY_PROVIDERS: 'thirdPartyProviders'
  }
};

function getCache() {
  return redis;
}
const hsetAsync = promisify(redis.hset).bind(redis);
const hmsetAsync = promisify(redis.hmset).bind(redis);
const hgetAsync = promisify(redis.hget).bind(redis);
const hgetallAsync = promisify(redis.hgetall).bind(redis);


const self = module.exports;
self.CONSTANTS = CONSTANTS;
self.getCache = getCache;


module.exports = {
  getCache,
  CONSTANTS,
  commands: {
    hget: hgetAsync,
    hset: hsetAsync,
    hmset: hmsetAsync,
    hgetall: hgetallAsync
  }
};
