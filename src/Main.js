const core = require('gls-core-service');
const env = require('./Env');
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const MongoDB = core.service.MongoDB;

class Main extends BasicService {
    constructor() {
        super();

        this.printEnvBasedConfig(env);
        this.addNested(new MongoDB()); // TODO -
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
