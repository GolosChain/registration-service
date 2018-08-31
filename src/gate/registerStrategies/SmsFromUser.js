const core = require('gls-core-service');
const errors = core.httpError;
const stats = core.statsClient;
const locale = require('../../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        smsGate.on('incoming', this._handleSms.bind(this));

        this._subscribes = new Map();
    }

    async register({ user, phone, mail }, recentModel) {
        if (recentModel && this._isActual(recentModel)) {
            if (recentModel.registered) {
                throw { code: 409, message: 'User already registered, just wait blockchain sync.' };
            }

            if (recentModel.isPhoneVerified) {
                return { currentState: 'toBlockChain' };
            } else {
                return { currentState: 'verify' };
            }
        }

        const model = new User({ user, phone, mail, strategy: 'smsFromUser' });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }
    }

    async verify() {
        throw errors.E406.error;
    }

    async toBlockChain({ model, ...keys }) {
        if (this._isActual(model)) {
            if (model.registered) {
                throw { code: 409, message: 'User already registered, just wait blockchain sync.' };
            }

            if (!model.isPhoneVerified) {
                return { currentState: 'verify' };
            }
        } else {
            throw errors.E404.error;
        }

        await this._registerInBlockChain(model.user, { ...keys });
    }

    async _handleSms(phone) {
        const timer = new Date();
        const model = await User.findOne({ strategy: 'smsFromUser', phone });

        if (!model || !this._isActual(model)) {
            return;
        }

        if (model.isPhoneVerified) {
            return;
        }

        model.isPhoneVerified = true;
        await model.save();

        await this._notifyUserMobileAboutPhoneVerified(model.user, phone);

        try {
            await this._notifyFrontendAboutPhoneVerified(phone);
        } catch (error) {
            // do nothing, notify late
        }

        stats.timing('sms_from_user_verify', new Date() - timer);
    }

    async _notifyUserMobileAboutPhoneVerified(user, phone) {
        const lang = this._getLangBy(phone);
        const message = locale.sms.successVerification[lang]({ user });

        await this._smsGate.sendTo(phone, message);
    }

    async _notifyFrontendAboutPhoneVerified(phone) {
        const channelId = this._subscribes.get(phone);

        if (!channelId) {
            return;
        }

        await this.sendTo('facade', 'transfer', {
            channelId,
            method: 'registration.phoneVerified',
            result: { status: 'OK' },
        });
    }

    async subscribeOnSmsGet({ channelId, phone }) {
        this._subscribes.set(phone, channelId);
    }
}

module.exports = SmsFromUser;
