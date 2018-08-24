const core = require('gls-core-service');
const stats = core.Stats.client;
const errors = core.HttpError;
const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        smsGate.on('incoming', this.verify.bind(this));

        this._subscribes = new Map();
    }

    async register({ user, phone, mail }) {
        const timer = new Date();
        let model = await this._findActualUser(user);

        if (model) {
            if (model.isPhoneVerified) {
                return { state: 'toBlockChain' };
            } else {
                return { state: 'verify' };
            }
        }

        model = new User({ user, phone, mail, registrationStrategy: 'smsFromUser' });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }

        stats.timing('sms_to_user_first_step', new Date() - timer);
    }

    async verify(phone) {
        const timer = new Date();
        const query = this._addExpirationEdge({ phone, registrationStrategy: 'smsFromUser' });
        const model = await User.findOne(query);

        if (!model) {
            return;
        }

        model.isPhoneVerified = true;
        await model.save();

        const lang = this._getLangBy(phone);
        const message = locale.sms.successVerification[lang]({ user: model.user });

        await this._smsGate.sendTo(phone, message);

        try {
            const channelId = this._subscribes.get(phone);

            await this.sendTo('facade', 'transfer', {
                channelId,
                method: 'registration.phoneVerified',
                result: { status: 'OK' },
            });
        } catch (error) {
            // do nothing, notify late
        }

        stats.timing('sms_to_user_verify', new Date() - timer);
    }

    async subscribeOnSmsGet({ channelId, phone }) {
        this._subscribes.set(phone, channelId);
    }

    async toBlockChain(user, keys) {
        const model = this._findActualUser(user);

        if (!model || model.registrationStrategy !== 'smsFromUser') {
            throw errors.E404.error;
        }

        if (!model.isPhoneVerified) {
            throw errors.E400.error;
        }

        await this._registerInBlockChain(user, keys);
    }
}

module.exports = SmsFromUser;
