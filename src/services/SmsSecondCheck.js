const request = require('request-promise-native');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Moments = core.utils.Moments;
const Logger = core.Logger;
const stats = core.statsClient;
const env = require('../env');
const User = require('../models/User');

class SmsSecondCheck extends BasicService {
    constructor(smsc, twilio) {
        super();

        this._smsc = smsc;
        this._twilio = twilio;
    }

    async start() {
        this.startLoop(env.GLS_SMS_SECOND_CHECK_INTERVAL, env.GLS_SMS_SECOND_CHECK_INTERVAL);
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
        return await this._smsc.getPhonesHistory();
    }

    async _extractPhonesHistoryFromTWILIO() {
        const ago = env.GLS_SMS_VERIFY_EXPIRATION_HOURS + 1;
        const query = { dateSent: Moments.ago(ago) };
        const result = [];

        this._twilio.messages.each(query, message => result.push(message.from));

        return result;
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
