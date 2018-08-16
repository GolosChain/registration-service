const Abstract = require('./Abstract');

class Social extends Abstract {
    async handle() {
        throw { code: 501, message: 'Not implemented for this version' };
    }
}

module.exports = Social;
