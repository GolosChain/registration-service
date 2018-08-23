const core = require('gls-core-service');
const stats = core.Stats.client;
const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        smsGate.on('incoming', this.verify.bind(this));
    }

    async register({ user, phone, mail }) {
        const timer = new Date();
        let model = User.findOne({ user });

        if (model) {
            if (model.isPhoneVerified) {
                return { state: 'toBlockChain' };
            } else {
                return { state: 'verify' };
            }
        }

        model = new User({ user, phone, mail });

        await model.save();
        stats.timing('sms_to_user_first_step', new Date() - timer);
    }

    // TODO -
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
