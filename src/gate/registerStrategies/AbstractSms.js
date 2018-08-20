const Abstract = require('./Abstract');
const core = require('gls-core-service');
const Moments = core.Moments;
const env = require('../../env');
const User = require('../../models/User');

class AbstractSms extends Abstract {
    _isUserDropVerification(user, registrationStrategy) {
        const query = this._addExpirationEdge({ user, registrationStrategy });
        const userByEdge = User.findOne(query);

        return !!userByEdge;
    }

    async _findActualUser(user) {
        const query = this._addExpirationEdge({ user });

        return await User.findOne(query);
    }

    _getLangBy(phone) {
        switch (true) {
            case /^\+7|^\+380|^\+375/.test(phone):
                return 'ru';
            default:
                return 'en';
        }
    }

    _addExpirationEdge(query) {
        const expirationValue = env.GLS_SMS_VERIFY_EXPIRATION_HOURS;
        const expirationEdge = Moments.ago(expirationValue * 60 * 60 * 1000);

        query.createdAt = { $gt: expirationEdge };
    }
}

module.exports = AbstractSms;