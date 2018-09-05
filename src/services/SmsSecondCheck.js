const request = require('request-promise-native');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.Logger;
const stats = core.statsClient;
const env = require('../env');
const User = require('../models/User');

const SMSC_URL = 'https://smsc.ru/sys/get.php';

class SmsSecondCheck extends BasicService {
    async start() {
        this.startLoop(1000, env.GLS_SMS_SECOND_CHECK_INTERVAL);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        const history = await this._extractPhonesHistory();
        const filtrated = await this._filtrateHistoryByModels(history);

        await this._notifyAboutVerified(filtrated);
    }

    async _extractPhonesHistory() {
        let smsc = [];
        let twilio = [];

        try {
            smsc = await this._extractPhonesHistoryFromSMSC();
        } catch (error) {
            Logger.error(`Get history from SMSC - ${error}`);
            stats.increment('get_history_from_smsc_error');
        }

        try {
            twilio = await this._extractPhonesHistoryFromTWILIO();
        } catch (error) {
            Logger.error(`Get history from TWILIO - ${error}`);
            stats.increment('get_history_from_twilio_error');
        }

        return [].concat(smsc, twilio);
    }

    async _extractPhonesHistoryFromSMSC() {
        const login = env.GLS_SMS_GATE_LOGIN;
        const pass = env.GLS_SMS_GATE_PASS;
        const hour = env.GLS_SMS_VERIFY_EXPIRATION_HOURS + 1;
        const query = `${SMSC_URL}?get_answers=1&login=${login}&psw=${pass}&fmt=3&hour=${hour}`;
        const rawHistory = await request.get(query);
        const history = JSON.parse(rawHistory);
        const result = [];

        if (history.error) {
            throw `SMSC history error - [${history.error_code}] ${history.error}`;
        }

        if (!Array.isArray(history)) {
            throw `Invalid SMSC history response - ${rawHistory}`;
        }

        for (let entity of history) {
            if (entity.message === '[CALL]') {
                continue;
            }

            result.push(entity.phone);
        }

        return result;
    }

    async _extractPhonesHistoryFromTWILIO() {
        // TODO Implement TWILIO
        return [];
    }

    async _filtrateHistoryByModels(history) {
        const result = [];

        for (let phone of history) {
            const count = await User.countDocuments({
                strategy: 'smsFromUser',
                phone,
                isPhoneVerified: false,
            });

            if (count) {
                result.push(phone);
            }
        }

        return result;
    }

    async _notifyAboutVerified(history) {
        for (let phone of history) {
            this.emit('sms', phone);
        }
    }
}

module.exports = SmsSecondCheck;
