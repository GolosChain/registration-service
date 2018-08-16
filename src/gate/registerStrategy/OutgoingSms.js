const Abstract = require('./Abstract');

class OutgoingSms extends Abstract {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async handle() {
        // TODO -
    }
}

module.exports = OutgoingSms;
