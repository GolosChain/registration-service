const core = require('gls-core-service');
const Gate = core.service.Gate;
const SocialStrategy = require('./registerStrategy/Social');
const MailStrategy = require('./registerStrategy/Mail');
const OutgoingSmsStrategy = require('./registerStrategy/OutgoingSms');
const IngoingSmsStrategy = require('./registerStrategy/IngoingSms');

class Router extends Gate {
    constructor(smsGate) {
        super();

        this._socialStrategy = new SocialStrategy();
        this._mailStrategy = new MailStrategy();
        this._outgoingSmsStrategy = new OutgoingSmsStrategy(smsGate);
        this._ingoingSmsStrategy = new IngoingSmsStrategy(smsGate);
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
        // TODO -
    }

    async _callRegisterStrategy(data) {
        switch (this._getCurrentStrategy()) {
            case 'social':
                return await this._socialStrategy.handle(data);
            case 'mail':
                return await this._mailStrategy.handle(data);
            case 'ingoingSms':
                return await this._ingoingSmsStrategy.handle(data);
            case 'outgoingSms':
                return await this._outgoingSmsStrategy.handle(data);
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
