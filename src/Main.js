const core = require('gls-core-service');
const stats = core.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const env = require('./env');
const Connector = require('./services/Connector');
const SmsGate = require('./services/SmsGate');
const SmsSecondCheck = require('./services/SmsSecondCheck');
const Smsc = require('./utils/Smsc');
const twilio = require('twilio')(env.GLS_SMS_GATE_SECRET_SID, env.GLS_TWILIO_SECRET);

class Main extends BasicMain {
    constructor() {
        super(stats);

        const smsc = new Smsc();
        const mongoDb = new MongoDB();
        const smsGate = new SmsGate(smsc, twilio);
        const smsSecondCheck = new SmsSecondCheck(smsc, twilio);
        const connector = new Connector(smsGate, smsSecondCheck);

        this.printEnvBasedConfig(env);
        this.addNested(mongoDb, smsGate, connector, smsSecondCheck);
    }
}

module.exports = Main;
