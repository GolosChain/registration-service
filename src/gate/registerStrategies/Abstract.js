const golos = require('golos-js');
const { key_utils: keyUtils } = require('golos-js/lib/auth/ecc');
const env = require('../../env');

class Abstract {
    async register() {
        throw 'Not implemented';
    }

    async verify() {
        throw 'Not implemented';
    }

    async registerInBlockChain(model, keys) {
        throw 'Not implemented';
    }

    async _isUserDropVerification(user) {
        throw 'Not implemented';
    }

    async _isUserInBlockChain(user) {
        const accounts = await golos.api.getAccountsAsync([user]);

        return !!accounts.length;
    }

    async _makeRetryMessage(strategy) {
        return { retryVerification: strategy };
    }

    async _registerInBlockChain(userName) {
        let { ownerKey, activeKey, postingKey, memoKey } = this._makeBlockChainKeys(userName);
        let jsonMetadata = '{}';
        let extensions = [];

        await golos.broadcast.accountCreateWithDelegationAsync(
            env.GLS_REGISTRAR_KEY,
            env.GLS_ACCOUNT_FEE, // TODO from blockchain
            env.GLS_ACCOUNT_DELEGATION_FEE, // TODO calculate from static (golos to vest)
            env.GLS_REGISTRAR_ACCOUNT,
            userName,
            this._makeFormedMetaKey(ownerKey),
            this._makeFormedMetaKey(activeKey),
            this._makeFormedMetaKey(postingKey),
            memoKey,
            jsonMetadata,
            extensions
        );
    }

    _makeBlockChainKeys(user) {
        let random = keyUtils.get_random_key().toWif();
        let pass = `P${random}`;
        let keyTypes = ['owner', 'active', 'posting', 'memo'];

        return golos.auth.generateKeys(user, pass, keyTypes);
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
