const Abstract = require('./Abstract');

class Social extends Abstract {
    constructor(connector) {
        super({ connector });
    }

    async getState() {
        throw { code: 501, message: 'Not implemented for this version' };
    }

    async firstStep() {
        throw { code: 501, message: 'Not implemented for this version' };
    }

    async verify() {
        throw { code: 501, message: 'Not implemented for this version' };
    }

    async toBlockChain() {
        throw { code: 501, message: 'Not implemented for this version' };
    }
}

module.exports = Social;
