const golos = require('golos-js');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const Moments = core.Moments;
const env = require('../../env');
const User = require('../../models/User');

class Abstract {
    async register() {
        throw 'Not implemented';
    }

    async verify() {
        throw 'Not implemented';
    }

    async _registerInBlockChain(user, { owner, active, posting, memo }) {
        const jsonMetadata = '{}';
        const extensions = [];
        const chainProps = await golos.api.getChainPropertiesAsync();
        const fee = chainProps.create_account_min_golos_fee;
        const globalProps = BlockChainValues.getDynamicGlobalProperties();
        const golosDelegation = env.GLS_ACCOUNT_DELEGATION_FEE;
        const vestsDelegation = BlockChainValues.golosToVests(golosDelegation, globalProps);

        await golos.broadcast.accountCreateWithDelegationAsync(
            env.GLS_REGISTRAR_KEY,
            fee,
            vestsDelegation,
            env.GLS_REGISTRAR_ACCOUNT,
            user,
            this._makeFormedMetaKey(owner),
            this._makeFormedMetaKey(active),
            this._makeFormedMetaKey(posting),
            memo,
            jsonMetadata,
            extensions
        );
    }

    _makeFormedMetaKey(key) {
        return {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [[key, 1]],
        };
    }

    async _findActualUser(user) {
        const query = this._addExpirationEdge({ user });

        return await User.findOne(query);
    }

    _addExpirationEdge(query) {
        const expirationValue = env.GLS_SMS_VERIFY_EXPIRATION_HOURS;
        const expirationEdge = Moments.ago(expirationValue * 60 * 60 * 1000);

        query.createdAt = { $gt: expirationEdge };

        return query;
    }
}

module.exports = Abstract;
