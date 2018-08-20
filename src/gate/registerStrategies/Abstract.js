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
    }
}

module.exports = Abstract;
