const core = require('gls-core-service');
const Moments = core.utils.Moments;
const errors = core.httpError;
const Abstract = require('./Abstract');
const env = require('../../env');

class AbstractSms extends Abstract {
    async changePhone({ model, phone }) {
        if (!this._isActual(model)) {
            throw errors.E404.error;
        }

        if (model.isPhoneVerified) {
            throw errors.E406.error;
        }

        model.phone = phone;
        await model.save();
    }

    _getLangBy(phone) {
        switch (true) {
            case /^\+7|^\+380|^\+375/.test(phone):
                return 'ru';
            default:
                return 'en';
        }
    }

    _isActual(model) {
        const expirationValue = env.GLS_SMS_VERIFY_EXPIRATION_HOURS;
        const expirationEdge = Moments.ago(expirationValue * 60 * 60 * 1000);

        return model.createdAt > expirationEdge;
    }
}

module.exports = AbstractSms;
