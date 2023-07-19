const nodeSchedule = require('node-schedule');
const paymentCustomerService = require('../../services/payment/customer');


function run() {
  // Run every last day of the month
  const schedules = ['55 12 30 4,6,9,11', '55 12 31 1,3,5,7,8,10,12', '55 12 28 2'];
  // eslint-disable-next-line no-restricted-syntax
  for (const schedule of schedules) {
    nodeSchedule.scheduleJob(schedule, paymentCustomerService.billAllCustomers);
  }
}


module.exports = {
  run
};
