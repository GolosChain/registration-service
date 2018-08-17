const core = require('gls-core-service');
const env = require('./Env');
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const MongoDB = core.service.MongoDB;
const Router = require('./gate/Router');
const SmsGate = require('./services/SmsGate');

class Main extends BasicService {
    constructor() {
        super();

        const mongoDb = new MongoDB();
        const smsGate = new SmsGate();
        const router = new Router(smsGate);

        this.printEnvBasedConfig(env);
        this.addNested(mongoDb, smsGate, router);
        this.stopOnExit();
    }

    async start() {
        await this.startNested();
        stats.increment('main_service_start');
    }

    async stop() {
        await this.stopNested();
        stats.increment('main_service_stop');
        process.exit(0);
    }
}

module.exports = Main;
