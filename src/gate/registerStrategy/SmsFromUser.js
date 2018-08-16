const Abstract = require('./Abstract');

class SmsFromUser extends Abstract {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async handle() {
        // TODO -
    }
}

module.exports = SmsFromUser;
