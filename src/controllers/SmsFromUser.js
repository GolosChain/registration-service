const core = require('gls-core-service');
const errors = require('../utils/Errors');
const stats = core.utils.statsClient;
const Logger = core.utils.Logger;
const locale = require('../data/locale');
const AbstractSms = require('./AbstractSms');
const User = require('../models/User');

class SmsFromUser extends AbstractSms {
    constructor(...args) {
        super(...args);

        this._subscribes = new Map();

        // TODO -
        smsGate.on('incoming', this._handleSms.bind(this));
        smsSecondCheck.on('sms', this._handleSms.bind(this));
    }

    async firstStep({ user, phone, mail }, recentModel) {
        const recentState = this._handleRecentModel(recentModel, phone);

        if (recentState) {
            return recentState;
        }

        await this._throwIfPhoneDuplicate(user, phone, 'smsFromUser');

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
        const timer = Date.now();
        const model = await User.findOne(
            { strategy: 'smsFromUser', phone },
            {},
            { sort: { _id: -1 } }
        );

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

        stats.timing('sms_from_user_verify', Date.now() - timer);
    }

    async _notifyUserMobileAboutPhoneVerified(user, phone) {
        setImmediate(() => {
            const lang = this._getLangBy(phone);
            const message = locale.sms.successVerification[lang]();

            this.callService('sms', 'plainSms', { phone, message, lang }).catch(error => {
                Logger.error(`Send success sms error - ${error}`);
            });
        });
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
