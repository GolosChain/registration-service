const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register({ user, phone, mail }) {
        const model = new User({ user, phone, mail });

        await model.save();
    }

    async verify() {
        // TODO -

        const lang = this._getLangBy(phone);
        const message = locale.sms.successVerification[lang]({ user });

        await this._smsGate.sendTo(phone, message);
    }
}

module.exports = SmsFromUser;
