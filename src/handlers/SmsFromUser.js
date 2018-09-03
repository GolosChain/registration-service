const core = require('gls-core-service');
const errors = core.httpError;
const stats = core.statsClient;
const locale = require('../locale');
const AbstractSms = require('./AbstractSms');
const User = require('../models/User');

class SmsFromUser extends AbstractSms {
    constructor(smsGate) {
        super();

        smsGate.on('incoming', this._handleSms.bind(this));

        this._subscribes = new Map();
    }

    async firstStep({ user, phone, mail }, recentModel) {
        const recentState = this._handleRecentModel(recentModel, phone);

        if (recentState) {
            return recentState;
        }

        await this._throwIfPhoneDuplicate(user, phone);

        const model = new User({ user, phone, mail, strategy: 'smsFromUser' });

        try {
            await model.save();
        } catch (error) {
            throw { code: 400, message: error.message };
        }

        return { strategy: 'smsFromUser' };
    }

    async verify() {
        throw errors.E406.error;
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
        const message = locale.sms.successVerification[lang]();

        await this._smsGate.sendTo(phone, message, lang);
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
