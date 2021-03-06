const golos = require('golos-js');
const request = require('request-promise-native');
const core = require('gls-core-service');
const BasicConnector = core.services.Connector;
const stats = core.utils.statsClient;
const Logger = core.utils.Logger;
const errors = require('../utils/Errors');
const env = require('../data/env');
const SocialStrategy = require('../controllers/Social');
const MailStrategy = require('../controllers/Mail');
const SmsToUserStrategy = require('../controllers/SmsToUser');
const SmsFromUserStrategy = require('../controllers/SmsFromUser');
const StrategyUtil = require('../utils/Strategy');
const User = require('../models/User');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Connector extends BasicConnector {
    constructor() {
        super();

        this._controllers = {
            social: new SocialStrategy({ connector: this }),
            mail: new MailStrategy({ connector: this }),
            smsToUser: new SmsToUserStrategy({ connector: this }),
            smsFromUser: new SmsFromUserStrategy({ connector: this }),
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

                // sms receiver api
                incomingSms: checkEnable(this._incomingSms),
                recentSmsList: checkEnable(this._recentSmsList),

                // control api
                getStrategyChoicer: this._getStrategyChoicer.bind(this),
                setStrategyChoicer: this._setStrategyChoicer.bind(this),
                enableRegistration: this._enableRegistrationByApi.bind(this),
                disableRegistration: this._disableRegistrationByApi.bind(this),
                isRegistrationEnabled: this._isRegistrationEnabledByApi.bind(this),
                deleteAccount: this._deleteAccount.bind(this),
                isRegistered: this.isRegistered.bind(this),
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                mail: env.GLS_MAIL_CONNECT,
                sms: env.GLS_SMS_CONNECT,
            },
        });
    }

    async _deleteAccount({ targetUser, testingPass = null }) {
        if (!targetUser || !this._isTestingSystem(testingPass)) {
            throw { code: 403, message: 'Access denied' };
        }

        await User.deleteOne({ user: targetUser, isTestingSystem: true });
    }

    enableRegistration() {
        this._isEnabled = true;
    }

    disableRegistration() {
        this._isEnabled = false;
    }

    isRegistrationEnabled() {
        return this._isEnabled;
    }

    _checkEnable(handler) {
        return async (...params) => {
            if (this._isEnabled) {
                return await handler.apply(this, params);
            }

            throw { code: 423, message: 'Registration disabled' };
        };
    }

    async _getState({ user }) {
        const timer = Date.now();

        if (await this._isUserInBlockChain(user)) {
            return { currentState: 'registered' };
        }

        const recentModel = await this._getUserModel(user);

        if (!recentModel) {
            return { currentState: 'firstStep' };
        }

        const result = this._controllers[recentModel.strategy].getState(recentModel);

        stats.timing('registration_get_state', Date.now() - timer);
        return result;
    }

    async _firstStep({ captcha, user, phone, mail, testingPass = null }) {
        if (
            !user ||
            typeof user !== 'string' ||
            !phone ||
            typeof phone !== 'string' ||
            !mail ||
            typeof mail !== 'string'
        ) {
            throw { code: 400, message: 'Invalid params' };
        }

        const timer = Date.now();
        const isTestingSystem = this._isTestingSystem(testingPass);

        await this._throwIfUserInBlockChain(user);

        if (env.GLS_CAPTCHA_ON && !isTestingSystem) {
            await this._checkCaptcha(captcha);
        }

        const strategy = await this._choiceStrategy();
        const handler = this._controllers[strategy];
        const recentModel = await this._getUserModel(user);
        const result = await handler.firstStep({ user, phone, mail, isTestingSystem }, recentModel);

        stats.timing('registration_first_step', Date.now() - timer);
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
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);
        const result = this._controllers[model.strategy].verify({ model, ...data });

        stats.timing('registration_verify', Date.now() - timer);
        return result;
    }

    async _toBlockChain({ user, ...keys }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);
        const result = this._controllers[model.strategy].toBlockChain({ model, ...keys });

        stats.timing('registration_to_blockchain', Date.now() - timer);
        return result;
    }

    async _changePhone({ user, phone, captcha = null, testingPass = null }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser', 'smsToUser']);

        if (
            env.GLS_CAPTCHA_ON &&
            model.strategy === 'smsToUser' &&
            !this._isTestingSystem(testingPass)
        ) {
            await this._checkCaptcha(captcha);
        }

        const result = this._controllers[model.strategy].changePhone({ model, phone });

        stats.timing('registration_change_phone', Date.now() - timer);
        return result;
    }

    async _resendSmsCode({ user, phone }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsToUser']);

        const result = this._controllers[model.strategy].resendSmsCode({ model, phone });

        stats.timing('registration_resend_sms_code', Date.now() - timer);
        return result;
    }

    async _subscribeOnSmsGet({ user, phone, channelId }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser']);

        const target = this._controllers[model.strategy];
        const result = target.subscribeOnSmsGet({ user, phone, channelId });

        stats.timing('registration_subscribe_on_sms_get', Date.now() - timer);
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

    async _getStrategyChoicer() {
        return this._strategyUtil.getStrategyChoicer();
    }

    async _setStrategyChoicer({ choicer, data = null }) {
        this._strategyUtil.setStrategyChoicer(choicer, data);
    }

    async _enableRegistrationByApi() {
        this.enableRegistration();
        this.emit('enableRegistrationByApi');
    }

    async _disableRegistrationByApi() {
        this.disableRegistration();
        this.emit('disableRegistrationByApi');
    }

    async _isRegistrationEnabledByApi() {
        return { enabled: this.isRegistrationEnabled() };
    }

    async _incomingSms({ phone }) {
        await this._controllers.smsFromUser.handleIncomingSms({ phone });
    }

    async _recentSmsList({ list }) {
        await this._controllers.smsFromUser.handleRecentSmsList({ list });
    }

    _isTestingSystem(testingPass) {
        if (!testingPass || !env.GLS_TESTING_PASS) {
            return false;
        }

        return testingPass === env.GLS_TESTING_PASS;
    }

    async isRegistered(username) {
        const user = await User.findOne({ user: username });

        if (user && user.registered) {
            return true;
        }

        return false;
    }
}

module.exports = Connector;
