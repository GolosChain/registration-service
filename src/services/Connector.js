const golos = require('golos-js');
const request = require('request-promise-native');
const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const errors = core.httpError;
const stats = core.statsClient;
const Logger = core.Logger;
const env = require('../env');
const SocialStrategy = require('../controllers/Social');
const MailStrategy = require('../controllers/Mail');
const SmsToUserStrategy = require('../controllers/SmsToUser');
const SmsFromUserStrategy = require('../controllers/SmsFromUser');
const StrategyUtil = require('../utils/Strategy');
const User = require('../models/User');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Connector extends BasicConnector {
    constructor(smsGate, smsSecondCheck) {
        super();

        this._controllers = {
            social: new SocialStrategy(this),
            mail: new MailStrategy(this),
            smsToUser: new SmsToUserStrategy(this, smsGate),
            smsFromUser: new SmsFromUserStrategy(this, smsGate, smsSecondCheck),
        };

        this._strategyUtil = new StrategyUtil();
        this._isEnabled = env.GLS_IS_REG_ENABLED_ON_START;
    }

    async start() {
        const checkEnable = this._checkEnable.bind(this);

        await super.start({
            serverRoutes: {
                // step api
                getState: checkEnable(this._getState),
                firstStep: checkEnable(this._firstStep),
                verify: checkEnable(this._verify),
                toBlockChain: checkEnable(this._toBlockChain),

                // strategy-specific api
                changePhone: checkEnable(this._changePhone),
                resendSmsCode: checkEnable(this._resendSmsCode),
                subscribeOnSmsGet: checkEnable(this._subscribeOnSmsGet),

                // control api
                setStrategyChoicer: this._setStrategyChoicer.bind(this),
                enableRegistration: this._enableRegistration.bind(this),
                disableRegistration: this._disableRegistration.bind(this),
                isRegistrationEnabled: this._isRegistrationEnabled.bind(this),
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
            },
        });
    }

    _checkEnable(handler) {
        return async (...params) => {
            if (this._isEnabled) {
                return await handler.apply(this, params);
            }

            return { code: 423, message: 'Registration disabled' };
        };
    }

    async _getState({ user }) {
        const timer = new Date();

        if (await this._isUserInBlockChain(user)) {
            return { currentState: 'registered' };
        }

        const recentModel = await this._getUserModel(user);

        if (!recentModel) {
            return { currentState: 'firstStep' };
        }

        const result = this._controllers[recentModel.strategy].getState(recentModel);

        stats.timing('registration_get_state', new Date() - timer);
        return result;
    }

    async _firstStep({ captcha, user, phone, mail }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);
        await this._checkCaptcha(captcha);

        const strategy = await this._choiceStrategy();
        const handler = this._controllers[strategy];
        const recentModel = await this._getUserModel(user);
        const result = await handler.firstStep({ user, phone, mail }, recentModel);

        stats.timing('registration_first_step', new Date() - timer);
        return result;
    }

    async _checkCaptcha(captcha) {
        const rawResult = await request({
            method: 'POST',
            uri: GOOGLE_CAPTCHA_API,
            form: {
                secret: env.GLS_GOOGLE_CAPTCHA_SECRET,
                response: captcha,
            },
        });

        let result;

        try {
            result = JSON.parse(rawResult);
        } catch (error) {
            Logger.error('Google invalid response');
            stats.increment('google_invalid_response');
            throw error.E500.error;
        }

        if (result.success !== true) {
            throw errors.E403.error;
        }
    }

    async _choiceStrategy() {
        return await this._strategyUtil.choiceStrategy();
    }

    async _verify({ user, ...data }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);
        const result = this._controllers[model.strategy].verify({ model, ...data });

        stats.timing('registration_verify', new Date() - timer);
        return result;
    }

    async _toBlockChain({ user, ...keys }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);
        const result = this._controllers[model.strategy].toBlockChain({ model, ...keys });

        stats.timing('registration_to_blockchain', new Date() - timer);
        return result;
    }

    async _changePhone({ user, phone }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser', 'smsToUser']);

        const result = this._controllers[model.strategy].changePhone({ model, phone });

        stats.timing('registration_change_phone', new Date() - timer);
        return result;
    }

    async _resendSmsCode({ user, phone }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsToUser']);

        const result = this._controllers[model.strategy].resendSmsCode({ model, phone });

        stats.timing('registration_resend_sms_code', new Date() - timer);
        return result;
    }

    async _subscribeOnSmsGet({ user, phone, channelId }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser']);

        const target = this._controllers[model.strategy];
        const result = target.subscribeOnSmsGet({ user, phone, channelId });

        stats.timing('registration_subscribe_on_sms_get', new Date() - timer);
        return result;
    }

    async _getUserModelOrThrow(user) {
        const model = await this._getUserModel(user);

        if (!model) {
            throw errors.E404.error;
        }

        return model;
    }

    async _getUserModel(user) {
        return await User.findOne({ user }, {}, { sort: { _id: -1 } });
    }

    _onlyStrategies(model, strategies) {
        if (!strategies.includes(model.strategy)) {
            throw errors.E406.error;
        }
    }

    async _throwIfUserInBlockChain(user) {
        if (await this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }
    }

    async _isUserInBlockChain(user) {
        const accounts = await golos.api.getAccountsAsync([user]);

        return !!accounts.length;
    }

    async _setStrategyChoicer({ choicer, data = null }) {
        this._strategyUtil.setStrategyChoicer(choicer, data);
    }

    async _enableRegistration() {
        this._isEnabled = true;
    }

    async _disableRegistration() {
        this._isEnabled = false;
    }

    async _isRegistrationEnabled() {
        return this._isEnabled;
    }
}

module.exports = Connector;