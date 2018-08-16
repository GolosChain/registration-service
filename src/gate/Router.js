const request = require('request-promise-native');
const core = require('gls-core-service');
const Gate = core.service.Gate;
const errors = core.HttpError;
const env = require('../env');
const SocialStrategy = require('./registerStrategy/Social');
const MailStrategy = require('./registerStrategy/Mail');
const SmsToUserStrategy = require('./registerStrategy/SmsToUser');
const SmsFromUserStrategy = require('./registerStrategy/SmsFromUser');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Router extends Gate {
    constructor(smsGate) {
        super();

        this._socialStrategy = new SocialStrategy();
        this._mailStrategy = new MailStrategy();
        this._smsToUserStrategy = new SmsToUserStrategy(smsGate);
        this._smsFromUserStrategy = new SmsFromUserStrategy(smsGate);
    }

    async start() {
        await super.start({
            serverRoutes: {
                register: this._register.bind(this),
                verifySmsToUserStrategy: this._smsToUserStrategy.verify.bind(this),
                verifySmsFromUserStrategy: this._smsFromUserStrategy.verify.bind(this),
                verifyMailStrategy: this._mailStrategy.verify.bind(this),
                verifySocialStrategy: this._socialStrategy.verify.bind(this),
            },
        });
    }

    async _register({ captcha, ...data }) {
        await this._checkCaptcha(captcha);
        await this._callRegisterStrategy(data);
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
        switch (this._getCurrentStrategy()) {
            case 'social':
                return await this._socialStrategy.register(data);
            case 'mail':
                return await this._mailStrategy.register(data);
            case 'smsFromUser':
                return await this._smsFromUserStrategy.register(data);
            case 'smsToUser':
                return await this._smsToUserStrategy.register(data);
            default:
                throw 'Invalid strategy';
        }
    }

    _getCurrentStrategy() {
        // TODO -
    }
}

module.exports = Router;
