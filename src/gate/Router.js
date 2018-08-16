const request = require('request-promise-native');
const core = require('gls-core-service');
const Gate = core.service.Gate;
const errors = core.HttpError;
const env = require('../env');
const SocialStrategy = require('./registerStrategy/Social');
const MailStrategy = require('./registerStrategy/Mail');
const SmsToUser = require('./registerStrategy/SmsToUser');
const SmsFromUser = require('./registerStrategy/SmsFromUser');

const GOOGLE_CAPTCHA_API = 'https://www.google.com/recaptcha/api/siteverify';

class Router extends Gate {
    constructor(smsGate) {
        super();

        this._socialStrategy = new SocialStrategy();
        this._mailStrategy = new MailStrategy();
        this._smsToUser = new SmsToUser(smsGate);
        this._smsFromUser = new SmsFromUser(smsGate);
    }

    async start() {
        await super.start({
            serverRoutes: {
                register: (...data) => this._register(...data),
                verifySmsCode: (...data) => this._verifySmsCode(...data),
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
                return await this._socialStrategy.handle(data);
            case 'mail':
                return await this._mailStrategy.handle(data);
            case 'smsFromUser':
                return await this._smsFromUser.handle(data);
            case 'smsToUser':
                return await this._smsToUser.handle(data);
            default:
                throw 'Invalid strategy';
        }
    }

    _getCurrentStrategy() {
        // TODO -
    }

    _verifySmsCode() {
        // TODO -
    }
}

module.exports = Router;
