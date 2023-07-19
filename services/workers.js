const stompService = require('./stomp');
const metricService = require('./metrics');
const customerService = require('./customers');
const messageService = require('./messages');
const jobService = require('../services/jobs');
// const deviceService = require('../services/device');

function init({ customers, metricTypes, customerIds }) {
  customerService.set.customerIds(customerIds);
  jobService.billing.run();

  customerService.setCustomers(customers);
  metricService.metricTypes.setMetricTypes(metricTypes);
  // messageService.init();
  stompService.connect();

  // deviceService.migrate.notSpecified({ customerId: 1 }).then((result) => {
  //   console.log(result);
  // }).catch((err) => {
  //   console.error(err);
  // });
}

module.exports = {
  init
};
