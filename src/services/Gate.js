const golos = require('golos-js');
const request = require('request-promise-native');
const core = require('gls-core-service');
const GateService = core.services.Gate;
const errors = core.httpError;
const stats = core.statsClient;
const env = require('../env');
const SocialStrategy = require('../handlers/Social');
const MailStrategy = require('../handlers/Mail');
const SmsToUserStrategy = require('../handlers/SmsToUser');
const SmsFromUserStrategy = require('../handlers/SmsFromUser');
const User = require('../models/User');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Gate extends GateService {
    constructor(smsGate) {
        super();

        this._strategies = {
            social: new SocialStrategy(),
            mail: new MailStrategy(),
            smsToUser: new SmsToUserStrategy(smsGate),
            smsFromUser: new SmsFromUserStrategy(smsGate),
        };

        this._strategyInc = 0;
    }

    async start() {
        await super.start({
            serverRoutes: {
                // step api
                firstStep: this._firstStep.bind(this),
                verify: this._verify.bind(this),
                toBlockChain: this._toBlockChain.bind(this),

                // strategy-specific api
                changePhone: this._changePhone.bind(this),
                resendSmsCode: this._resendSmsCode.bind(this),
                subscribeOnSmsGet: this._subscribeOnSmsGet.bind(this),
            },
        });
    }

    async _firstStep({ captcha, user, phone, mail }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);
        await this._checkCaptcha(captcha);

        const strategy = await this._choiceStrategy();
        const handler = this._strategies[strategy];
        const recentModel = await this._getUserModel(user);

        await handler.firstStep({ user, phone, mail }, recentModel);
        stats.timing('registration_first_step', new Date() - timer);
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

        // TODO Remove false when frontend done
        if (false && result.success !== true) {
            throw errors.E403.error;
        }
    }

    async _choiceStrategy() {
        // TODO More effective choicer with Google Analyst
        const strategies = ['smsFromUser', 'smsToUser'];
        const choice = strategies[this._strategyInc % 2];

        this._strategyInc++;

        return choice;
    }

    async _verify({ user, ...data }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._strategies[model.strategy].verify({ model, ...data });
        stats.timing('registration_verify', new Date() - timer);
    }

    async _toBlockChain({ user, ...keys }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._strategies[model.strategy].toBlockChain({ model, ...keys });
        stats.timing('registration_to_blockchain', new Date() - timer);
    }

    async _changePhone({ user, phone }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser', 'smsToUser']);
        this._strategies[model.strategy].changePhone({ user, phone });
        stats.timing('registration_change_phone', new Date() - timer);
    }

    async _resendSmsCode({ user, phone }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsToUser']);
        this._strategies[model.strategy].resendSmsCode({ user, phone });
        stats.timing('registration_resend_sms_code', new Date() - timer);
    }

    async _subscribeOnSmsGet({ user, phone, channelId }) {
        const timer = new Date();

        await this._throwIfUserInBlockChain(user);

        const model = await this._getUserModelOrThrow(user);

        this._onlyStrategies(model, ['smsFromUser']);
        this._strategies[model.strategy].subscribeOnSmsGet({ user, phone, channelId });
        stats.timing('registration_subscribe_on_sms_get', new Date() - timer);
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
        const accounts = await golos.api.getAccountsAsync([user]);

        if (accounts.length) {
            throw { code: 409, message: 'User already in blockchain.' };
        }
    }
}

module.exports = Gate;
