const random = require('random');
const locale = require('../../locale');
const core = require('gls-core-service');
const stats = core.Stats.client;
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsToUser extends AbstractSms {
    constructor(smsGate) {
        super();

        this._smsGate = smsGate;
    }

    async register({ user, phone, mail }) {
        const timer = new Date();

        if (this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        if (this._isUserDropVerification(user, 'smsToUser')) {
            return this._makeRetryMessage('smsToUser');
        }

        const code = random.int(1000, 9999);
        const model = new User({ user, phone, mail, smsCode: code });
        const lang = this._getLangBy(phone);
        const message = locale.sms.activationCode[lang]({ code });

        await model.save();
        await this._smsGate.sendTo(phone, message);

        stats.timing('reg_step1_sms_to_user', new Date() - timer);
    }

    async verify({ user, code }) {
        // TODO -
    }
}

module.exports = SmsToUser;
