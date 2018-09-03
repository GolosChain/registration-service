const golos = require('golos-js');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const env = require('../env');

class Abstract {
    async getState() {
        throw 'Not implemented';
    }

    async firstStep() {
        throw 'Not implemented';
    }

    async verify() {
        throw 'Not implemented';
    }

    async toBlockChain() {
        throw 'Not implemented';
    }

    async _registerInBlockChain(user, { owner, active, posting, memo }) {
        const jsonMetadata = '{}';
        const extensions = [];
        const chainProps = await golos.api.getChainPropertiesAsync();
        const fee = chainProps.create_account_min_golos_fee;
        const globalProps = await BlockChainValues.getDynamicGlobalProperties();
        const golosDelegation = env.GLS_ACCOUNT_DELEGATION_FEE;
        const vestsDelegation = BlockChainValues.golosToVests(golosDelegation, globalProps);

        await golos.broadcast.accountCreateWithDelegationAsync(
            env.GLS_REGISTRAR_KEY,
            fee,
            `${vestsDelegation} GESTS`,
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
}

module.exports = Abstract;
