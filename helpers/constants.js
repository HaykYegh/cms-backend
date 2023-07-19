const config = require('config');

const appConfig = config.get('app');

const constants = {

  CUSTOMERS: {
    ZANGI: 1,
  },

  SERVER_MESSAGES: {
    NETWORK: {
      JOIN: 'NETWORK_JOIN',
      LEAVE: 'NETWORK_LEAVE',
      KICK: 'NETWORK_KICK',
      UPDATE: 'NETWORK_UPDATE',
      DELETE: 'NETWORK_DELETE',
    },
    CHANNEL: {
      UPDATE: 'CHANNEL_UPDATE'
    },
  },

  RESOURCES: {
    WEBSITE: appConfig.system.resource.token
  },
  APPLICATION: {},
  BILLING: {
    METHODS: {
      CHEQUE: 1,
      VISA: 2,
      MASTERCARD: 3,
      AMEX: 4,
      ACH: 5,
      DISCOVERY: 6,
      DINERS: 7,
      PAYPAL: 8,
      GATEWAY_KEY: 9,
      ADYEN: 10,
      TWO_CHECKOUT: 11,
      SKRILL: 12,
      GATE2SHOP: 13,
      APPLE: 14,
      NIKITA_SMS: 15,
      CHARGING_CARD: 16,
      TRANSFER: 17,
      ADMIN: 18,
      RUNO: 19,
      GOOGLE: 20,
      STRIPE: 21,
      CHARGINGCARD: 16,
      ANDROID: 20,
      BRAINTREE: 40,
      BKASH: 41,
      ROCKET: 42,
      IPAY: 43,
      UPAY: 44,
      NEXUS: 45
    }
  },

  S3: {
    PREFIX: {
      GATEWAY: 'gateway'
    }
  },

  ACTIVITY: {
    ACTIONS: {
      ADD_BALANCE: 3,
      DELETE_USER: 2,
    }
  },

  SOCKET: {
    ACTION: {
      CREATE: 1,
      READ: 2,
      UPDATE: 3,
      DELETE: 4,
    }
  },

  INFO_TYPE: {
    USERS: {
      REGISTERED_USERS: 'registered_users',
      UNREGISTERED_USERS: 'unregistered_users',
      UNREGISTERED_USERS_LIST: 'unregistered_users_list',
    },
    HUB: {
      VN: {
        VALIDATE: {
          EMAIL: 'email',
          VN_NAME: 'vnName'
        }
      }
    }
  },

  ZANGI_BUSINESS: {
    CONFIG_KEY: 'businessPanel',
    USER_TYPES: {
      TEAM_MEMBER: 'TEAM_MEMBER',
      CLIENT: 'CLIENT',
    },
  },

  PAYMENTS: {
    STRIPE: {
      WEBHOOKS: {
        EVENTS: {
          INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
          INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
        }
      }
    },
    HISTORY_TYPES: {
      YEARLY: 'yearly',
      MONTHLY: 'monthly',
    }
  },
};


module.exports = constants;

