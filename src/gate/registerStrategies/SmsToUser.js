const random = require('random');
const core = require('gls-core-service');
const stats = core.Stats.client;
const errors = core.HttpError;
const locale = require('../../locale');
const env = require('../../env');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsToUser extends AbstractSms {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register({ user, phone, mail }) {
        const timer = new Date();

        if (this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        if (this._isUserDropVerification(user, 'smsToUser')) {
            return this._makeRetryMessage('smsToUser');
        }

        const code = this._generateSmsCode();
        const model = new User({ user, phone, mail, smsCode: code });
        const message = this._makeSmsCodeMessage(phone, code);

        model.smsCodeDate = new Date();

        await model.save();
        await this._smsGate.sendTo(phone, message);

        stats.timing('reg_sms_to_user_first_step', new Date() - timer);
    }

    async changePhone({ user, phone }) {
        const timer = new Date();
        const model = await this._findActualUser(user);

        this._validateUserState(model);

        model.phone = phone;

        await model.save();

        stats.timing('reg_sms_to_user_change_phone', new Date() - timer);
    }

    async resendCode({ user }) {
        const timer = new Date();
        const model = await this._findActualUser(user);

        this._validateUserState(model);

        if (new Date() - +model.smsCodeDate <= env.GLS_PHONE_VERIFY_TIMEOUT) {
            throw errors.E406.error;
        }

        const phone = model.phone;
        const code = this._generateSmsCode();
        const message = this._makeSmsCodeMessage(phone, code);

        model.smsCode = code;
        model.smsCodeDate = new Date();

        await model.save();
        await this._smsGate.sendTo(phone, message);

        stats.timing('reg_sms_to_user_resend_code', new Date() - timer);
    }

    async verify({ user, code }) {
        const timer = new Date();
        const model = await this._findActualUser(user);

        this._validateUserState(model);

        if (model.smsCode !== code.toString()) {
            throw errors.E400.error;
        }

        model.isPhoneVerified = true;

        await model.save();
        await this._registerInBlockChain(model.user);

        stats.timing('reg_sms_to_user_verify', new Date() - timer);
    }

    _validateUserState(model) {
        if (!model) {
            throw errors.E404.error;
        }

        if (model.registrationStrategy !== 'smsToUser' || model.isPhoneVerified) {
            throw errors.E406.error;
        }
    }

    _generateSmsCode() {
        return random.int(1000, 9999);
    }

    _makeSmsCodeMessage(phone, code) {
        const lang = this._getLangBy(phone);

        return locale.sms.activationCode[lang]({ code });
    }
}

module.exports = SmsToUser;