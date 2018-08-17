const random = require('random');
const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsToUser extends AbstractSms {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register({ user, phone, mail }) {
        const code = random.int(1000, 9999);
        const model = new User({ user, phone, mail, smsCode: code });
        const lang = this._getLangBy(phone);
        const message = locale.sms.activationCode[lang]({ code });

        await model.save();
        await this._smsGate.sendTo(phone, message);
    }

    async verify({ user, code }) {
        // TODO -
    }
}

module.exports = SmsToUser;
