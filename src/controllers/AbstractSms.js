const PhoneUtils = require('../utils/Phone');
const core = require('gls-core-service');
const Moments = core.utils.Moments;
const Logger = core.utils.Logger;
const errors = require('../utils/Errors');
const Abstract = require('./Abstract');
const env = require('../data/env');
const User = require('../models/User');
const LegacyUser = require('../models/LegacyUser');

class AbstractSms extends Abstract {
    async getState(recentModel) {
        if (!this._isActual(recentModel)) {
            return { currentState: 'firstStep' };
        }

        if (recentModel.registered) {
            return { currentState: 'registered' };
        }

        if (recentModel.isPhoneVerified) {
            return { currentState: 'toBlockChain' };
        }

        return { currentState: 'verify', strategy: recentModel.strategy };
    }

    async changePhone({ model, phone }) {
        await this._throwIfPhoneDuplicate(model.user, phone, model.strategy);

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

        try {
            await this._registerInBlockChain(model.user, { ...keys });
        } catch (error) {
            Logger.error(`BlockChain registration error - ${error}`);

            throw { code: 500, message: 'BlockChain error' };
        }

        const phone = model.phone;

        model.registered = true;
        model.phone = PhoneUtils.maskBody(phone);
        model.phoneHash = PhoneUtils.saltedHash(phone);
        await model.save();

        await this._sendFinishMail(model.mail, this._getLangBy(model.phone));
    }

    _handleRecentModel(recentModel, phone) {
        if (recentModel && this._isActual(recentModel)) {
            if (recentModel.registered) {
                throw { code: 409, message: 'User already registered, just wait blockchain sync.' };
            }

            if (recentModel.phone !== phone) {
                throw { code: 409, message: 'Account already registered.' };
            }

            if (recentModel.isPhoneVerified) {
                return { currentState: 'toBlockChain', strategy: recentModel.strategy };
            } else {
                return { currentState: 'verify', strategy: recentModel.strategy };
            }
        }
    }

    async _throwIfPhoneDuplicate(user, phone, strategy) {
        if (await this._isLegacyUser(phone)) {
            this._throwPhoneDuplicateError();
        }

        const phoneHash = PhoneUtils.saltedHash(phone);
        const model = await User.findOne(
            { strategy, $or: [{ phone }, { phoneHash }] },
            {},
            { sort: { _id: -1 } }
        );

        if (!model) {
            return;
        }

        if (this._isActual(model) || model.registered) {
            this._throwPhoneDuplicateError();
        }
    }

    async _isLegacyUser(phone) {
        const count = await LegacyUser.countDocuments({ phoneHash: PhoneUtils.plainHash(phone) });

        return !!count;
    }

    _throwPhoneDuplicateError() {
        throw { code: 409, message: 'Phone already registered.' };
    }

    _getLangBy(phone) {
        switch (true) {
            case /^7|^380/.test(phone):
                return 'ru';

            case /^375/.test(phone):
                return 'by';

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
