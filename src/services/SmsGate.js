const R = require('ramda');
const micro = require('micro');
const core = require('gls-core-service');
const BasicService = core.service.Basic;
const Logger = core.Logger;
const stats = core.Stats.client;
const errors = core.HttpError;
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
        const data = this._tryExtractRequestData(req, res);

        if (!this._tryValidateSecretSid(data, res)) {
            return;
        }

        const phone = this._tryExtractPhone(data, res);

        if (!phone) {
            return;
        }

        this.emit('incoming', phone);

        micro.send(res, 200, { status: 'OK' });
    }

    _tryExtractRequestData(req, res) {
        const data = micro.json(req);

        if (!R.is(Object, data)) {
            stats.increment('invalid_sms_callback_call');
            this._sendError(res, 400);
            return;
        }

        return data;
    }

    _tryValidateSecretSid(data, res) {
        if (data.AccountSid !== env.GLS_SMS_GATE_SECRET_SID) {
            stats.increment('unauthorized_sms_callback_call');
            this._sendError(res, 403);
            return;
        }

        return true;
    }

    _tryExtractPhone(data, res) {
        let phone;

        if (data.From) {
            if (!R.is(String, data.From)) {
                this._sendError(res, 400);
                return;
            } else {
                phone = data.From.slice(1);
            }
        } else if (R.is(String, data.phone)) {
            phone = data.phone;
        } else {
            this._sendError(res, 400);
            return;
        }

        return phone;
    }

    _sendError(res, errorCode) {
        const { code, message } = errors[`E${errorCode}`].error;

        micro.send(res, code, message);
    }

    async sendTo(phone, message) {
        // TODO -
    }
}

module.exports = SmsGate;
