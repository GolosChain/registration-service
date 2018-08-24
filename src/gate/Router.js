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
                firstStep: this._firstStep.bind(this),
                verify: this._verify.bind(this),
                toBlockChain: this._toBlockChain.bind(this),

                // strategy-specific api
                changePhone: this._changePhone.bind(this),
                resendSmsCode: smsToUser.resendCode.bind(smsToUser),
                subscribeOnSmsGet: smsFromUser.subscribeOnSmsGet.bind(smsFromUser),
            },
        });
    }

    async _firstStep({ captcha, ...data }) {
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

        // TODO -
        if (false && result.success !== true) {
            throw errors.E403.error;
        }
    }

    async _callRegisterStrategy({ user, phone, mail }) {
        if (await this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        const target = this._strategyMap[this._getCurrentStrategy()];

        if (!target) {
            stats.increment('invalid_generated_strategy');
            Logger.error('Invalid generated strategy');
            process.exit(1);
        }

        return await target.register({ user, phone, mail });
    }

    async _verify(data) {
        // TODO -
    }

    async _toBlockChain({ user, keys, strategy }) {
        if (await this._isUserInBlockChain(user)) {
            throw { code: 409, message: 'User already in blockchain.' };
        }

        const target = this._strategyMap[strategy];

        if (!target) {
            throw errors.E400.error;
        }

        target.toBlockChain(user, keys);
    }

    _getCurrentStrategy() {
        // TODO Dynamic calculation
        return 'smsFromUser';
    }

    async _changePhone({ user, phone }) {
        // TODO -
    }

    async _isUserInBlockChain(user) {
        const accounts = await golos.api.getAccountsAsync([user]);

        return !!accounts.length;
    }
}

module.exports = Router;
