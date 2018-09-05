const core = require('gls-core-service');
const stats = core.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./env');
const Gate = require('./services/Gate');
const SmsGate = require('./services/SmsGate');
const SmsSecondCheck = require('./services/SmsSecondCheck');

class Main extends BasicMain {
    constructor() {
        super(stats);

        const mongoDb = new MongoDB();
        const smsGate = new SmsGate();
        const smsSecondCheck = new SmsSecondCheck();
        const gate = new Gate(smsGate, smsSecondCheck);

        this.printEnvBasedConfig(env);
        this.addNested(mongoDb, smsGate, gate, smsSecondCheck);
    }
}

module.exports = Main;
