const micro = require('micro');
const core = require('gls-core-service');
const BasicService = core.service.Basic;
const Logger = core.Logger;
const stats = core.Stats.client;
const env = require('../env');

class SmsGate extends BasicService {
    constructor() {
        super();

        this._server = null;
    }

    start() {
        const port = env.GLS_SMS_GATE_PORT;
        const host = env.GLS_SMS_GATE_HOST;
        const server = micro(this._handleSmsFromUser.bind(this));

        server.on('error', error => {
            Logger.error(error);
            stats.increment('sms_get_error');
        });

        return new Promise((resolve, reject) => {
            server.listen(port, host, error => {
                if (error) {
                    reject(error);
                    return;
                }

                this._server = server;
                resolve();
            });
        });
    }

    stop() {
        return new Promise(resolve => this._server.close(resolve));
    }

    async _handleSmsFromUser(req, res) {
        // TODO -
    }

    async sendTo(phone, message) {
        // TODO -
    }
}

module.exports = SmsGate;
