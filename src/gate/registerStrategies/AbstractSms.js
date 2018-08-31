const core = require('gls-core-service');
const Moments = core.utils.Moments;
const errors = core.httpError;
const Abstract = require('./Abstract');
const env = require('../../env');
const User = require('../../models/User');

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

    async toBlockChain({ model, ...keys }) {
        if (this._isActual(model)) {
            if (model.registered) {
                throw { code: 409, message: 'User already registered, just wait blockchain sync.' };
            }

            if (!model.isPhoneVerified) {
                return errors.E409.error;
            }
        } else {
            throw errors.E404.error;
        }

        await this._registerInBlockChain(model.user, { ...keys });
    }

    _handleRecentModel(recentModel) {
        if (recentModel && this._isActual(recentModel)) {
            if (recentModel.registered) {
                throw { code: 409, message: 'User already registered, just wait blockchain sync.' };
            }

            if (recentModel.isPhoneVerified) {
                return { currentState: 'toBlockChain' };
            } else {
                return { currentState: 'verify' };
            }
        }
    }

    async _throwIfPhoneDuplicate(user, phone) {
        const model = await User.findOne({ strategy: 'smsFromUser', phone });

        if (!model) {
            return;
        }

        if (this._isActual(model) || model.registered) {
            throw { code: 409, message: 'Phone already registered.' };
        }
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
