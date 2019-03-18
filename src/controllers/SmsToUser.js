const random = require('random');
const core = require('gls-core-service');
const Logger = core.utils.Logger;
const errors = require('../utils/Errors');
const locale = require('../data/locale');
const env = require('../data/env');
const AbstractSms = require('./AbstractSms');
const User = require('../models/User');
const States = require('../data/states');

class SmsToUser extends AbstractSms {
    _getSmsRetryState(recentModel) {
        if (recentModel.state === 'verify') {
            if (recentModel.smsCodeResendCount > env.GLS_SMS_RESEND_CODE_MAX) {
                return null;
            }
            return this._calcNextSmsRetry(recentModel);
        }
    }

    async firstStep({ user, phone, mail, isTestingSystem }, recentModel) {
        const recentState = this._handleRecentModel(recentModel, phone);

        if (recentState) {
            return recentState;
        }

        await this._throwIfPhoneDuplicate(user, phone, 'smsToUser');

        const model = new User({
            user,
            phone,
            mail,
            strategy: 'smsToUser',
            state: States.VERIFY,
            isTestingSystem,
        });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }

        if (isTestingSystem) {
            return {
                code: await this._makeAndApplyTestingSmsCode(model),
                strategy: 'smsToUser',
                nextSmsRetry: this._calcNextSmsRetry(),
            };
        }

        setImmediate(() => {
            this._sendSmsCode(model, phone).catch(error => {
                Logger.error(`Send sms code error - ${error}`);
            });
        });

        return {
            strategy: 'smsToUser',
            nextSmsRetry: this._calcNextSmsRetry(),
        };
    }

    async _makeAndApplyTestingSmsCode(model) {
        const code = this._makeSmsCode();

        await this._applySmsCode(model, code);

        return code;
    }

    async _sendSmsCode(model, phone) {
        const lang = this._getLangBy(phone);
        const code = this._makeSmsCode();
        const message = locale.sms.activationCode[lang]({ code });

        await this._applySmsCode(model, code);
        await this.callService('sms', 'plainSms', { phone, message, lang });
    }

    _makeSmsCode() {
        return random.int(1000, 9999);
    }

    async _applySmsCode(model, code) {
        model.smsCode = code;
        model.smsCodeDate = new Date();

        await model.save();
    }

    async verify({ model, code }) {
        code = String(code);

        if (!this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E409.error;
        }

        if (model.smsCode !== code) {
            throw {
                ...errors.E403.error,
                nextSmsRetry: this._getSmsRetryState(model),
            };
        }

        model.isPhoneVerified = true;
        model.state = States.SET_USERNAME;
        await model.save();
    }

    async changePhone({ model, phone }) {
        await super.changePhone({ model, phone });

        model.smsCodeResendCount = 0;
        model.smsCodeDate = new Date();

        await model.save();

        if (!model.isTestingSystem) {
            await this._sendSmsCode(model, model.phone);
        }

        return { nextSmsRetry: this._calcNextSmsRetry() };
    }

    async resendSmsCode({ model }) {
        if (!this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E409.error;
        }

        if (Date.now() - model.smsCodeDate < env.GLS_SMS_RESEND_CODE_TIMEOUT) {
            throw { code: 429, message: 'Try later.' };
        }

        if (model.smsCodeResendCount > env.GLS_SMS_RESEND_CODE_MAX) {
            throw { code: 429, message: 'Too many retries.' };
        }

        model.smsCodeResendCount += 1;

        await model.save();

        let code;
        if (!model.isTestingSystem) {
            await this._sendSmsCode(model, model.phone);
        } else {
            code = await this._makeAndApplyTestingSmsCode(model);
        }

        return { nextSmsRetry: this._getSmsRetryState(model), code };
    }

    _calcNextSmsRetry(model = null) {
        if (model) {
            return +model.smsCodeDate + env.GLS_SMS_RESEND_CODE_TIMEOUT;
        } else {
            return Date.now() + env.GLS_SMS_RESEND_CODE_TIMEOUT;
        }
    }
}

module.exports = SmsToUser;
