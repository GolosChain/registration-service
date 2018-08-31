const core = require('gls-core-service');
const Moments = core.utils.Moments;
const Abstract = require('./Abstract');
const env = require('../../env');

class AbstractSms extends Abstract {
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
