const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.Logger;
const stats = core.statsClient;
const env = require('../env');
const User = require('../models/User');

class SmsSecondCheck extends BasicService {
    async start() {
        this.startLoop(1000, env.GLS_SMS_SECOND_CHECK_INTERVAL);
    }

    async stop() {
        this.stopLoop();
    }

    async iteration() {
        const history = await this._extractSmsHistory();
        const filtrated = await this._filtrateHistoryByModels(history);

        await this._notifyAboutVerified(filtrated);
    }

    async _extractSmsHistory() {
        let smsc = {};
        let twilio = {};

        try {
            smsc = await this._extractSmsHistoryFromSMSC();
        } catch (error) {
            Logger.error(`Get history from SMSC - ${error}`);
            stats.increment('get_history_from_smsc_error');
        }

        try {
            twilio = await this._extractSmsHistoryFromTWILIO();
        } catch (error) {
            Logger.error(`Get history from TWILIO - ${error}`);
            stats.increment('get_history_from_twilio_error');
        }

        return Object.assign({}, smsc, twilio);
    }

    async _extractSmsHistoryFromSMSC() {
        // TODO -
    }

    async _extractSmsHistoryFromTWILIO() {
        // TODO -
    }

    async _filtrateHistoryByModels(history) {
        // TODO -
    }

    async _notifyAboutVerified(history) {
        for (let phone of history) {
            this.emit('sms', phone);
        }
    }
}

module.exports = SmsSecondCheck;
