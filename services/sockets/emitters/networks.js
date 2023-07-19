const socketService = require('../../sockets');
const paymentCustomerService = require('../../payment/customer');
const paymentPlanService = require('../../payment/plan');
const networkService = require('../../network');


const { networkSocket } = socketService.getIO();

function emitTrialEnd(networkId) {
  networkSocket.in(networkId.toString()).emit('networkTrialEnd', { networkId });
}


function emitNetworkState(networkId) {
  (async () => {
    const state = await networkService.get.localState(null, { networkId });

    if (state.stripeId) {
      const [paymentCustomer, licensed] = await Promise.all([
        paymentCustomerService.retrieve(state.stripeId),
        paymentPlanService.get(state.defaults.planLicensed)
      ]);

      state.paymentCustomer = paymentCustomer;
      state.plans = { licensed };
    }
    networkSocket.in(networkId.toString()).emit('state', state);
  })();
}


module.exports = {
  trialEnd: emitTrialEnd,
  state: emitNetworkState
};
