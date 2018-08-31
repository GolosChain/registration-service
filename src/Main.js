const core = require('gls-core-service');
const stats = core.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./env');
const Gate = require('./services/Gate');
const SmsGate = require('./services/SmsGate');

class Main extends BasicMain {
    constructor() {
        super(stats);

        const mongoDb = new MongoDB();
        const smsGate = new SmsGate();
        const gate = new Gate(smsGate);

        this.printEnvBasedConfig(env);
        this.addNested(mongoDb, smsGate, gate);
    }
}

module.exports = Main;
