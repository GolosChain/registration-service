const random = require('random');
const locale = require('../../locale');
const core = require('gls-core-service');
const stats = core.Stats.client;
const errors = core.HttpError;
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

    async changePhone({ user, phone }) {
        const user = await User.findOne({ user });

        this._validateUserState(user);

        user.phone = phone;

        await user.save();
    }

    async verify({ user, code }) {
        const user = await User.findOne({ user });

        this._validateUserState(user);

        if (user.smsCode !== code.toString()) {
            throw errors.E400.error;
        }

        user.isPhoneVerified = true;

        await user.save();
        await this._registerInBlockChain(user.user);
    }

    _validateUserState(model) {
        if (!model) {
            throw errors.E404.error;
        }

        if (model.registrationStrategy !== 'smsToUser' || model.isPhoneVerified) {
            throw errors.E406.error;
        }
    }
}

module.exports = SmsToUser;
