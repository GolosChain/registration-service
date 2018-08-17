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
        // TODO -
    }

    async _makeRetryMessage(strategy) {
        return { retryVerification: strategy };
    }
}

module.exports = Abstract;
