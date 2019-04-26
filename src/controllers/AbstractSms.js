const PhoneUtils = require('../utils/Phone');
const core = require('gls-core-service');
const Moments = core.utils.Moments;
const Logger = core.utils.Logger;
const errors = require('../utils/Errors');
const Abstract = require('./Abstract');
const env = require('../data/env');
const User = require('../models/User');
const LegacyUser = require('../models/LegacyUser');
const States = require('../data/states');
const randomstring = require('randomstring');
const fetch = require('node-fetch');
const { JsonRpc } = require('cyberwayjs');
const RPC = new JsonRpc(env.GLS_CYBERWAY_CONNECT, { fetch });

class AbstractSms extends Abstract {
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

    async _canBeRegisteredOrThrow(model) {
        if (!(await this._isActual(model))) {
            throw errors.E404.error;
        }

        if (model.registered) {
            throw {
                code: 409,
                message: 'User already registered, just wait blockchain sync.',
            };
        }

        if (!model.isPhoneVerified) {
            throw errors.E409.error;
        }
    }

    async toBlockChain({ model, ...keys }) {
        await this._canBeRegisteredOrThrow(model);

        const accountName = await this._generateNewUsername();

        try {
            const username = model.user;
            await this._registerInBlockChain(accountName, username, { ...keys });
        } catch (error) {
            Logger.error(`BlockChain registration error - ${error}`);

            throw { code: 500, message: 'BlockChain error' };
        }

        const phone = model.phone;

        model.registered = true;
        model.phone = PhoneUtils.maskBody(phone);
        model.phoneHash = PhoneUtils.saltedHash(phone);
        model.state = States.REGISTERED;
        model.userId = accountName;
        await model.save();

        await this._sendFinishMail(model.mail, this._getLangBy(model.phone));

        return {
            userId: model.userId,
            username: model.user,
        };
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
                return { currentState: States.TO_BLOCK_CHAIN, strategy: recentModel.strategy };
            } else {
                return { currentState: States.VERIFY, strategy: recentModel.strategy };
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

    async _generateNewUsername() {
        const prefix = env.GLS_ACCOUNT_NAME_PREFIX;

        const accountName =
            prefix +
            randomstring.generate({
                length: 12 - prefix.length,
                charset: 'alphanumeric',
                capitalization: 'lowercase',
            });

        const occupied = await this._isUsernameOccupied(accountName);

        if (occupied) {
            return await this._generateNewUsername();
        }

        return accountName;
    }

    async _isUsernameOccupied(user) {
        try {
            await RPC.get_account(user);
            return true;
        } catch (error) {
            const errObject = error.json || error;

            if (errObject.code === 500) {
                return false;
            }

            const code = errObject.code || 500;
            const message = errObject.message || 'Unhandled blockchain error';

            throw { code, message, error };
        }
    }
}

module.exports = AbstractSms;
