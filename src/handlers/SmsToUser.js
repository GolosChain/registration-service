const random = require('random');
const core = require('gls-core-service');
const stats = core.statsClient;
const errors = core.httpError;
const locale = require('../locale');
const env = require('../env');
const AbstractSms = require('./AbstractSms');
const User = require('../models/User');

class SmsToUser extends AbstractSms {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register({ user, phone, mail }, recentModel) {
        const recentState = this._handleRecentModel(recentModel);

        if (recentState) {
            return recentState;
        }

        await this._throwIfPhoneDuplicate(user, phone);

        const model = new User({ user, phone, mail, strategy: 'smsToUser' });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }

        await this._sendSmsCode(model, phone);
    }

    async _sendSmsCode(model, phone) {
        if (model.smsCodeDate - new Date() < env.GLS_SMS_RESEND_CODE_TIMEOUT) {
            throw { code: 429, message: 'Try late.' };
        }

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

    async changePhone({ model, phone }) {
        if (this._isActual(model)) {
            throw errors.E404.error;
        }

        model.phone = phone;
        await model.save();
    }

    async resendCode({ phone }) {
        const model = await User.findOne({ strategy: 'smsToUser', phone });

        if (!model || !this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E409.error;
        }

        await this._sendSmsCode(model, phone);
    }
}

module.exports = SmsToUser;
