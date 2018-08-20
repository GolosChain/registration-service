const golos = require('golos-js');

class Abstract {
    async register() {
        throw 'Not implemented';
    }

    async verify() {
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

    async _registerInBlockChain(user) {
        // TODO -

        await this._sendRegisterToBlockChain({
            // TODO -
        });
    }

    async _sendRegisterToBlockChain({
        signingKey,
        fee,
        creator,
        name,
        jsonMetadata = '',
        ownerKey,
        activeKey,
        postingKey,
        memo,
    }) {
        // ugly blockchain format...

        const sharedMeta = { weight_threshold: 1, account_auths: [] };
        const operations = [['account_create']];

        operations[0].push({
            fee,
            creator,
            new_account_name: name,
            json_metadata: jsonMetadata,
            owner: { ...sharedMeta, key_auths: [[ownerKey, 1]] },
            active: { ...sharedMeta, key_auths: [[activeKey, 1]] },
            posting: { ...sharedMeta, key_auths: [[postingKey, 1]] },
            memo_key: memo,
        });

        await golos.broadcast.sendAsync({ extensions: [], operations }, [signingKey]);
    }
}

module.exports = Abstract;
