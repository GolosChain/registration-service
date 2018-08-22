const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        smsGate.on('incoming', this.verify.bind(this));
    }

    async register({ user, phone, mail }) {
        const model = new User({ user, phone, mail });

        await model.save();
    }

    async verify(phone) {
        const model = User.findOne({ phone, registrationStrategy: 'smsFromUser' });

        if (!model) {
            return;
        }

        model.isPhoneVerified = true;
        await model.save();

        const lang = this._getLangBy(phone);
        const message = locale.sms.successVerification[lang]({ user: model.user });

        await this._smsGate.sendTo(phone, message);
    }

    async subscribeOnSmsGet(user, phone) {
        // TODO -
    }
}

module.exports = SmsFromUser;
