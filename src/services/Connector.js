const request = require('request-promise-native');
const fetch = require('node-fetch');
const core = require('gls-core-service');
const { JsonRpc } = require('cyberwayjs');
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
const PhoneUtil = require('../utils/Phone');
const User = require('../models/User');

const RPC = new JsonRpc(env.GLS_CYBERWAY_CONNECT, { fetch });
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
        await super.start({
            serverRoutes: {
                // step api
                getState: {
                    handler: this._getState,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        properties: {
                            user: {
                                type: 'string',
                            },
                            phone: {
                                type: 'string',
                            },
                        },
                        oneOf: [{ required: ['phone'] }, { required: ['user'] }],
                    },
                },
                firstStep: {
                    handler: this._firstStep,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['phone'],
                        properties: {
                            phone: {
                                type: 'string',
                            },
                            testingPass: {
                                type: 'string',
                            },
                        },
                    },
                },
                verify: {
                    handler: this._verify,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['code', 'phone'],
                        properties: {
                            code: {
                                type: 'number',
                            },
                            phone: {
                                type: 'string',
                            },
                        },
                    },
                },
                setUsername: {
                    handler: this._setUsername,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['user', 'phone'],
                        properties: {
                            user: {
                                type: 'string',
                            },
                            phone: {
                                type: 'string',
                            },
                        },
                    },
                },
                toBlockChain: {
                    handler: this._toBlockChain,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                    validation: {
                        required: ['user', 'active', 'owner'],
                        properties: {
                            user: {
                                type: 'string',
                            },
                            active: {
                                type: 'string',
                            },
                            owner: {
                                type: 'string',
                            },
                            posting: {
                                type: 'string',
                            },
                        },
                        additionalProperties: true,
                    },
                },

                // strategy-specific api
                changePhone: {
                    handler: this._changePhone,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },
                resendSmsCode: {
                    handler: this._resendSmsCode,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },
                subscribeOnSmsGet: {
                    handler: this._subscribeOnSmsGet,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },

                // sms receiver api
                incomingSms: {
                    handler: this._incomingSms,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },
                recentSmsList: {
                    handler: this._recentSmsList,
                    scope: this,
                    before: [
                        {
                            handler: this._checkEnable,
                            scope: this,
                        },
                    ],
                },

                // control api
                getStrategyChoicer: {
                    handler: this._getStrategyChoicer,
                    scope: this,
                },
                setStrategyChoicer: {
                    handler: this._setStrategyChoicer,
                    scope: this,
                },
                enableRegistration: {
                    handler: this._enableRegistrationByApi,
                    scope: this,
                },
                disableRegistration: {
                    handler: this._disableRegistrationByApi,
                    scope: this,
                },
                isRegistrationEnabled: {
                    handler: this._isRegistrationEnabledByApi,
                    scope: this,
                },
                deleteAccount: {
                    handler: this._deleteAccount,
                    scope: this,
                },
                isRegistered: {
                    handler: this.isRegistered,
                    scope: this,
                },
            },
            requiredClients: {
                facade: env.GLS_FACADE_CONNECT,
                mail: env.GLS_MAIL_CONNECT,
                sms: env.GLS_SMS_CONNECT,
                prism: env.GLS_PRISM_CONNECT,
            },
        });
    }

    async _deleteAccount({ targetUser, targetPhone, testingPass = null }) {
        if (!this._isTestingSystem(testingPass)) {
            throw { code: 403, message: 'Access denied' };
        }

        if (!targetUser && !targetPhone) {
            throw { code: 403, message: 'Access denied' };
        }

        if (targetUser) {
            await User.deleteOne({ user: targetUser, isTestingSystem: true });
        }

        if (targetPhone) {
            const findPhone = { phone: targetPhone };

            if (targetPhone !== '+70000000001') {
                findPhone.isTestingSystem = true;
            }

            await User.deleteOne(findPhone);

            const phoneHash = PhoneUtil.saltedHash(targetPhone);
            const findHash = { phoneHash };

            if (targetPhone !== '+70000000001') {
                findHash.isTestingSystem = true;
            }
            await User.deleteOne(findHash);
        }
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

    _checkEnable(params) {
        if (this._isEnabled) {
            return params;
        }

        throw { code: 423, message: 'Registration disabled' };
    }

    async _getState({ user, phone }) {
        const timer = Date.now();

        if (await this._isUserInBlockChain(user)) {
            return { currentState: 'registered' };
        }

        const recentModel = await this._getUserModel({ user, phone });

        if (
            !recentModel ||
            !(await this._controllers[recentModel.strategy]._isActual(recentModel))
        ) {
            return { currentState: 'firstStep' };
        }

        stats.timing('registration_get_state', Date.now() - timer);
        return { currentState: recentModel.state, user: recentModel.user };
    }

    async _firstStep({ captcha, user, phone, mail, testingPass = null }) {
        if (!phone || typeof phone !== 'string') {
            throw { code: 400, message: 'Invalid params' };
        }

        const timer = Date.now();

        phone = this._normalizePhone(phone);

        const { currentState } = await this._getState({ user, phone });
        if (currentState !== 'firstStep') {
            throw {
                code: 400,
                message: 'Invalid step taken',
                currentState,
            };
        }

        const strategy = await this._choiceStrategy();
        const handler = this._controllers[strategy];
        const recentModel = await this._getUserModel({ user, phone });

        const isTestingSystem = this._isTestingSystem(testingPass);

        if (env.GLS_CAPTCHA_ON && !isTestingSystem) {
            await this._checkCaptcha(captcha);
        }

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

    async _verify({ user, phone, ...data }) {
        const timer = Date.now();

        const { currentState } = await this._getState({ user, phone });
        if (currentState !== 'verify') {
            throw {
                code: 400,
                message: 'Invalid step taken',
                currentState,
            };
        }

        const model = await this._getUserModelOrThrow({ user, phone });
        const result = await this._controllers[model.strategy].verify({ model, phone, ...data });

        stats.timing('registration_verify', Date.now() - timer);
        return result;
    }

    async _setUsername({ phone, user }) {
        const { currentState } = await this._getState({ phone });
        if (currentState !== 'setUsername') {
            throw {
                code: 400,
                message: 'Invalid step taken',
                currentState,
            };
        }

        const userState = await this._getState({ user });
        // name already taken
        if (userState.currentState !== 'firstStep') {
            throw {
                code: 400,
                message: 'Name is already in use',
            };
        }

        const userModel = await this._getUserModelOrThrow({ phone });

        userModel.user = user;
        userModel.state = 'toBlockChain';

        await userModel.save();
    }

    async _toBlockChain({ user, ...keys }) {
        if (!user) {
            throw {
                code: 400,
                message: 'User is a required parameter',
            };
        }
        const timer = Date.now();

        const { currentState } = await this._getState({ user });
        if (currentState !== 'toBlockChain') {
            throw {
                code: 400,
                message: 'Invalid step taken',
                currentState,
            };
        }

        const model = await this._getUserModelOrThrow({ user });
        const result = await this._controllers[model.strategy].toBlockChain({ model, ...keys });

        stats.timing('registration_to_blockchain', Date.now() - timer);
        return result;
    }

    async _changePhone({ user, phone, captcha = null, testingPass = null }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow({ user });

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

        if (user) {
            await this._throwIfUserInBlockChain(user);
        }

        const model = await this._getUserModelOrThrow({ user, phone });

        this._onlyStrategies(model, ['smsToUser']);

        const result = this._controllers[model.strategy].resendSmsCode({ model, phone });

        stats.timing('registration_resend_sms_code', Date.now() - timer);
        return result;
    }

    async _subscribeOnSmsGet({ user, phone, channelId }) {
        const timer = Date.now();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow({ user });

        this._onlyStrategies(model, ['smsFromUser']);

        const target = this._controllers[model.strategy];
        const result = target.subscribeOnSmsGet({ user, phone, channelId });

        stats.timing('registration_subscribe_on_sms_get', Date.now() - timer);
        return result;
    }

    async _getUserModelOrThrow({ user, phone }) {
        const model = await this._getUserModel({ user, phone });

        if (!model) {
            throw errors.E404.error;
        }

        return model;
    }

    async _getUserModel({ user, phone }) {
        if (user) {
            return await User.findOne({ user }, {}, { sort: { _id: -1 } });
        }

        if (phone) {
            phone = this._normalizePhone(phone);
            let userModel = await User.findOne({ phone }, {}, { sort: { _id: -1 } });

            if (!userModel) {
                const phoneHash = PhoneUtil.saltedHash(phone);
                userModel = await User.findOne({ phoneHash }, {}, { sort: { _id: -1 } });
            }
            return userModel;
        }

        return null;
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

    async _resolveName(user) {
        let name = user;
        if (user && user.includes('@')) {
            try {
                const resolved = await RPC.fetch('/v1/chain/resolve_names', [user]);
                name = resolved[0].resolved_username;
            } catch (error) {
                Logger.error('Error resolve account name -- ', error);
            }
        }
        return name;
    }

    async _isUserInBlockChain(user) {
        // TODO: use "resolve_names" method -> wait for blockchain
        try {
            await RPC.get_account(user);
            return true;
        } catch (error) {
            const errObject = error.json || error;

            if (errObject.code === 500) {
                return false;
            }

            Logger.error(errObject);

            const code = errObject.code || 1012;
            const message = errObject.message || 'Unhandled blockchain error';

            throw {
                code,
                message,
            };
        }
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

    async isRegistered({ userId }) {
        const userObject = await User.findOne({ userId });

        console.log(userId, JSON.stringify(userObject, 4, null));

        return { isRegistered: Boolean(userObject && userObject.registered) };
    }

    _normalizePhone(phone) {
        if (phone[0] !== '+') {
            phone = '+' + phone;
        }
        return phone;
    }
}

module.exports = Connector;
