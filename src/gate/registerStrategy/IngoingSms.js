const Abstract = require('./Abstract');

class IngoingSms extends Abstract {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    // TODO -
}

module.exports = IngoingSms;
