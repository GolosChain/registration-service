const random = require('random');
const core = require('gls-core-service');
const stats = core.utils.statsClient;
const Logger = core.utils.Logger;
const errors = require('../utils/Errors');
const locale = require('../data/locale');
const env = require('../data/env');
const AbstractSms = require('./AbstractSms');
const User = require('../models/User');

class SmsToUser extends AbstractSms {
    constructor(connector, smsGate) {
        super({ connector });

        this._smsGate = smsGate;
    }

    async getState(recentModel) {
        const state = await super.getState(recentModel);

        if (state.currentState === 'verify') {
            if (recentModel.smsCodeResendCount <= env.GLS_SMS_RESEND_CODE_MAX) {
                state.nextSmsRetry = recentModel.smsCodeDate + env.GLS_SMS_RESEND_CODE_TIMEOUT;
            } else {
                state.nextSmsRetry = null;
            }
        }

        return state;
    }

    async firstStep({ user, phone, mail }, recentModel) {
        const recentState = this._handleRecentModel(recentModel, phone);

        if (recentState) {
            return recentState;
        }

        await this._throwIfPhoneDuplicate(user, phone, 'smsToUser');

        const model = new User({ user, phone, mail, strategy: 'smsToUser' });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }

        setImmediate(() => {
            this._sendSmsCode(model, phone).catch(error => {
                stats.increment('send_sms_code_error');
                Logger.error(`Send sms code error - ${error}`);
            });
        });

        return {
            strategy: 'smsToUser',
            nextSmsRetry: new Date() + env.GLS_SMS_RESEND_CODE_TIMEOUT,
        };
    }

    async _sendSmsCode(model, phone) {
        const lang = this._getLangBy(phone);
        const code = random.int(1000, 9999);
        const message = locale.sms.activationCode[lang]({ code });

        model.smsCode = code;
        model.smsCodeDate = new Date();
        await model.save();

        await this._smsGate.sendTo(phone, message, lang);
    }

    async verify({ model, code }) {
        if (!this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E409.error;
        }

        if (model.smsCode !== code) {
            throw errors.E403.error;
        }

        model.isPhoneVerified = true;
        await model.save();
    }

    async resendSmsCode({ model, phone }) {
        if (!this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E409.error;
        }

        if (model.smsCodeDate - new Date() < env.GLS_SMS_RESEND_CODE_TIMEOUT) {
            throw { code: 429, message: 'Try late.' };
        }

        if (model.smsCodeResendCount > env.GLS_SMS_RESEND_CODE_MAX) {
            throw { code: 429, message: 'Too many retry.' };
        }

        model.smsCodeResendCount += 1;

        await model.save();

        await this._sendSmsCode(model, phone);
    }
}

module.exports = SmsToUser;
