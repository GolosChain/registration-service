const Abstract = require('./Abstract');
const User = require('../../model/User');

class SmsToUser extends Abstract {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register() {
        // TODO -
    }

    async verify() {
        // TODO -
    }
}

module.exports = SmsToUser;
