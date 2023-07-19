const stompit = require('stompit');

const config = require('config');
const networkService = require('../services/network');
const userStatsService = require('../services/user/stats');
const networkInviteService = require('../services/network/invites');
const metricsService = require('../services/metrics');
const networkEmitter = require('../services/sockets/emitters/networks');
const usageReportService = require('../services/payment/usage-record');
const logger = require('../services/logger');


let stompInstance = null;


const stompServers = config.get('stomp')
    .filter(instance => instance.host !== '')
    .map(instance => ({
        host: instance.host,
        port: instance.port,
        ssl: instance.ssl,
        connectHeaders: {
            host: '/',
            login: instance.username,
            passcode: instance.password
        }
    }));

const connect = () => {
    if (stompServers.length === 0) {
        return;
    }

    const manager = new stompit.ConnectFailover(stompServers, {
        maxReconnects: 100000
    });

    manager.connect((err, client, reconnect) => {
        console.log('read message connect');
        if (err) {
            console.error(err);
            console.log(`connection error ${err.message}`);
            return;
        }
        // return;

        // Subscribe and handle metric messages

        client.subscribe({
            destination: 'StatisticQueue',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error (StatisticQueue) ${error.message}  ${message}`);
                return client.ack(message);
            }

            message.readString('utf-8', (err, body) => {
                if (err) {
                    console.log(`read message error ${err.message}`);
                    return client.ack(message);
                }
                 // console.log(`StatisticQueue ${body}`);
                // console.log(count);
                try {
                    metricsService.handleMetricMessage(body, (err, results) => {
                        client.ack(message);
                        if (err) {
                            console.error(err);
                        } else {
                            // console.log(results);
                        }
                    });
                } catch (e) {
                    client.ack(message);
                    console.error(e);
                    logger.error(e);
                }
            });
        });
        // Subscribe and handle presence
        client.subscribe({
            destination: 'PresenceContainerQueue',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error ${error.message}`);
                return;
            }
            message.readString('utf-8', async (err, body) => {
                if (err) {
                    console.log(`read message error (PresenceContainerQueue) ${err.message}`);
                    return client.ack(message);
                }
                try {
                    await metricsService.handle.userPresence(body);
                    client.ack(message);
                } catch (e) {
                    client.ack(message);
                    console.error(e);
                    logger.error(e);
                }
            });
        });


        // Subscribe and handle presence
        // client.subscribe({
        //   destination: queues.messages,
        //   ack: 'client-individual'
        // }, (error, message) => {
        //   if (error) {
        //     console.log(`subscribe error ${error.message}`);
        //     return;
        //   }
        //   message.readString('utf-8', (err, body) => {
        //     if (err) {
        //       console.log(`read message error ${err.message}`);
        //       return client.ack(message);
        //     }
        //     messageService.set(body, (err) => {
        //       if (err) {
        //         // console.log(err);
        //         // client.nack(message);
        //       } else {
        //         client.ack(message);
        //       }
        //     });
        //   });
        // });

        client.subscribe({
            destination: 'USER_USAGE_HOOK',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error ${error.message}`);
                return;
            }
            message.readString('utf-8', (err, body) => {
                if (err) {
                    console.log(`read message error ${err.message}`);
                    return client.ack(message);
                }
                const data = JSON.parse(body);
                console.log(`Recieved user usage. ${JSON.stringify(data)}`);
                (async () => {
                    try {
                        await userStatsService.update.stats(data);
                        return client.ack(message);
                    } catch (e) {
                        logger.error(e);
                        // return client.ack(message);
                    }
                })();
            });
        });


        client.subscribe({
            destination: 'NETWORK_TRIAL_PERIOD_END',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error ${error.message}`);
                return;
            }
            message.readString('utf-8', (err, body) => {
                if (err) {
                    console.log(`read message error ${err.message}`);
                    return client.ack(message);
                }
                const event = JSON.parse(body);
                (async () => {
                    await networkService.endTrial(null, {networkId: event.networkId});
                    networkEmitter.trialEnd(event.networkId);
                    client.ack(message);
                })().catch((err) => {
                    // logger.error(err);
                });
            });
        });

        client.subscribe({
            destination: 'NETWORK_USAGE_HANDLER',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error ${error.message}`);
                return;
            }
            message.readString('utf-8', (err, body) => {
                if (err) {
                    console.log(`read message error ${err.message}`);
                    return client.ack(message);
                }
                const usageEvent = JSON.parse(body);

                (async () => {
                    await usageReportService.reportUsage(usageEvent);
                    client.ack(message);
                })().catch((err) => {
                    // logger.error(err);
                    client.ack(message);
                });
            });
        });


        client.subscribe({
            destination: 'NETWORK_INVITE_NOTIFIER_HANDLER',
            ack: 'client-individual'
        }, (error, message) => {
            if (error) {
                console.log(`subscribe error ${error.message}`);
                return;
            }
            message.readString('utf-8', (err, body) => {
                if (err) {
                    console.log(`read message error ${err.message}`);
                    return client.ack(message);
                }
                const notifier = JSON.parse(body);

                (async () => {
                    await networkInviteService.handle.notifier(notifier);
                    client.ack(message);
                })().catch((err) => {
                    logger.error(err);
                    client.nack(message);
                });
            });
        });


        client.on('error', (err) => {
            console.error(err);
            console.log(`connection error ${err.message}`);
            reconnect();
        });

        stompInstance = client;
    });
    };


    function sendQueueMessage(destination, value) {
    try {
        const queue = stompInstance.send({
            destination,
            'content-type': 'application/json'
        });
        queue.write(JSON.stringify(value));
        queue.end();
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    connect,
    sendQueueMessage
};
