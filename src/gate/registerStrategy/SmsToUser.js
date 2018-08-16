const Abstract = require('./Abstract');

class SmsToUser extends Abstract {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async handle() {
        // TODO -
    }
}

module.exports = SmsToUser;
