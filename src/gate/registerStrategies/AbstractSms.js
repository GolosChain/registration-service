const Abstract = require('./Abstract');
const core = require('gls-core-service');
const Moments = core.Moments;
const errors = core.HttpError;
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

        return query;
    }

    async registerInBlockChain(model, keys) {
        if (!model.isPhoneVerified) {
            throw errors.E403.error;
        }

        // TODO -
    }
}

module.exports = AbstractSms;
