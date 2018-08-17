const Abstract = require('./Abstract');
const core = require('gls-core-service');
const Moments = core.Moments;
const env = require('../../env');
const User = require('../../models/User');

class AbstractSms extends Abstract {
    _isUserDropVerification(user, registrationStrategy) {
        const expirationValue = env.GLS_SMS_VERIFY_EXPIRATION_HOURS;
        const expirationEdge = Moments.ago(expirationValue * 60 * 60 * 1000);
        const query = { user, registrationStrategy, createdAt: { $gt: expirationEdge } };
        const userByEdge = User.findOne(query);

        return !!userByEdge;
    }

    _getLangBy(phone) {
        switch (true) {
            case /^\+7|^\+380|^\+375/.test(phone):
                return 'ru';
            default:
                return 'en';
        }
    }
}

module.exports = AbstractSms;
