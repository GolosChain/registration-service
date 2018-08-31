const R = require('ramda');
const micro = require('micro');
const bodyParser = require('urlencoded-body-parser');
const core = require('gls-core-service');
const request = require('request-promise-native');
const BasicService = core.service.Basic;
const Logger = core.Logger;
const stats = core.statsClient;
const errors = core.HttpError;
const env = require('../env');
const twilio = require('twilio')(env.GLS_SMS_GATE_SECRET_SID, env.GLS_TWILIO_SECRET);

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
        try {
            const data = await this._tryExtractRequestData(req, res);

            if (!this._tryValidateSecretSid(data, res)) {
                return;
            }

            const phone = this._tryExtractPhone(data, res);

            if (!phone) {
                return;
            }

            this.emit('incoming', phone);

            this._sendOk(res);
        } catch (error) {
            stats.increment('invalid_sms_callback_parse');
            Logger.error(`Sms from user - ${error}`);
            this._sendError(res, 500);
        }
    }

    async _tryExtractRequestData(req, res) {
        const data = await bodyParser(req);

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

    _sendOk(res) {
        micro.send(res, 200, { result: 'OK' });
    }

    _sendError(res, errorCode) {
        const { code, message } = errors[`E${errorCode}`].error;

        micro.send(res, code, message);
    }

    async sendTo(phone, message, targetLang) {
        switch (targetLang) {
            case 'ru':
                const login = env.GLS_SMS_GATE_LOGIN;
                const pass = env.GLS_SMS_GATE_PASS;
                const sender = env.GLS_SMSC_SENDER_NAME;
                const point = 'https://smsc.ru/sys/send.php';

                await request.get(
                    `${point}?login=${login}&psw=${pass}&phones=${phone}&mes=${message}&sender=${sender}`
                );
                break;

            default:
                const from = env.GLS_TWILIO_PHONE_FROM;

                await twilio.messages.create({ from, body: message, to: phone });
        }
    }
}

module.exports = SmsGate;
