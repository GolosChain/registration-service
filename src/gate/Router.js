const golos = require('golos-js');
const request = require('request-promise-native');
const core = require('gls-core-service');
const Gate = core.service.Gate;
const errors = core.HttpError;
const stats = core.Stats.client;
const Logger = core.Logger;
const env = require('../env');
const SocialStrategy = require('./registerStrategies/Social');
const MailStrategy = require('./registerStrategies/Mail');
const SmsToUserStrategy = require('./registerStrategies/SmsToUser');
const SmsFromUserStrategy = require('./registerStrategies/SmsFromUser');
const User = require('../models/User');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Router extends Gate {
    constructor(smsGate) {
        super();

        this._strategyMap = {
            social: new SocialStrategy(),
            mail: new MailStrategy(),
            smsToUser: new SmsToUserStrategy(smsGate),
            smsFromUser: new SmsFromUserStrategy(smsGate),
        };
    }

    async start() {
        const smsToUser = this._strategyMap['smsToUser'];
        const smsFromUser = this._strategyMap['smsFromUser'];

        await super.start({
            serverRoutes: {
                // step api
                registerFirstStep: this._registerFirstStep.bind(this),
                verify: this._verify.bind(this),
                registerInBlockChain: this._registerInBlockChain.bind(this),

                // strategy-specific api
                changePhone: this._changePhone.bind(this),
                resendSmsCode: smsToUser.resendCode.bind(smsToUser),
                subscribeOnSmsGet: smsFromUser.subscribeOnSmsGet.bind(smsFromUser),
            },
        });
    }

    async _registerFirstStep({ captcha, ...data }) {
        await this._checkCaptcha(captcha);
        return await this._callRegisterStrategy(data);
    }

    async _checkCaptcha(captcha) {
        const result = await request({
            method: 'POST',
            uri: GOOGLE_CAPTCHA_API,
            json: true,
            body: {
                secret: env.GLS_GOOGLE_CAPTCHA_SECRET,
                response: captcha,
            },
        });

        if (result.success !== true) {
            throw errors.E403.error;
        }
    }

    async _callRegisterStrategy(data) {
        if (this._isUserInBlockChain(data.user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        const target = this._strategyMap[this._getCurrentStrategy()];

        if (!target) {
            stats.increment('invalid_generated_strategy');
            Logger.error('Invalid generated strategy');
            process.exit(1);
        }

        return await target.register(data);
    }

    async _verify(data) {
        if (this._isUserInBlockChain(data.user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        const model = await this._tryGetUser(data.user);
        const target = this._strategyMap[model.registrationStrategy];

        if (!target) {
            stats.increment('invalid_user_strategy');
            Logger.error('Invalid user strategy');
            process.exit(1);
        }

        return await target.verify(model, data);
    }

    async _registerInBlockChain({ user, keys }) {
        if (this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        const model = await this._tryGetUser(user);
        const target = this._strategyMap[model.registrationStrategy];

        if (!target) {
            stats.increment('invalid_user_strategy');
            Logger.error('Invalid user strategy');
            process.exit(1);
        }

        return await target.registerInBlockChain(model, keys);
    }

    async _tryGetUser(user) {
        const model = User.findOne({ user });

        if (!model) {
            throw errors.E403.error;
        }

        return model;
    }

    _getCurrentStrategy() {
        // TODO -
    }

    async _changePhone({ user, phone }) {
        const model = User.findOne({ user });

        if (!model) {
            throw errors.E403.error;
        }

        const strategy = model.registrationStrategy;

        if (!['smsToUser', 'smsFromUser'].includes(strategy)) {
            throw errors.E406.error;
        }

        return await this._strategyMap[strategy].changePhone(model, phone);
    }

    async _isUserInBlockChain(user) {
        const accounts = await golos.api.getAccountsAsync([user]);

        return !!accounts.length;
    }
}

module.exports = Router;
