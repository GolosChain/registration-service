const core = require('gls-core-service');
const BasicService = core.services.Basic;
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

        await this._syncVerifications(filtrated);
        await this._notifyAboutVerified(filtrated);
    }

    async _extractSmsHistory() {
        let smsc = {};
        let twilio = {};

        try {
            smsc = await this._extractSmsHistoryFromSMSC();
        } catch (error) {
            // TODO -
        }

        try {
            twilio = await this._extractSmsHistoryFromTWILIO();
        } catch (error) {
            // TODO -
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

    async _syncVerifications(history) {
        // TODO -
    }

    async _notifyAboutVerified(history) {
        // TODO -
    }
}

module.exports = SmsSecondCheck;
