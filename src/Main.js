const fs = require('fs');
const path = require('path');
const core = require('gls-core-service');
const stats = core.utils.statsClient;
const BasicMain = core.services.BasicMain;
const MongoDB = core.services.MongoDB;
const Logger = core.utils.Logger;
const env = require('./data/env');
const Connector = require('./services/Connector');
const LegacyUser = require('./models/LegacyUser');

class Main extends BasicMain {
    constructor() {
        super(stats, env);

        const connector = new Connector();
        this._mongoDb = new MongoDB();

        this.addNested(connector);
        this.defineMeta({ name: 'registration' });
    }

    async start() {
        Logger.info('Start MongoDb...');
        await this._mongoDb.start();
        Logger.info('The MongoDb done!');

        const legacyUsersCount = await LegacyUser.countDocuments();

        if (legacyUsersCount === 0) {
            Logger.info('Restore legacy users...');
            await this._restoreLegacyUsers();
            Logger.info('Restore done!');
        } else {
            Logger.info('Legacy users already loaded, ok.');
        }

        await super.start();
        this.addNested(this._mongoDb);
    }

    async _restoreLegacyUsers() {
        const dataPath = path.resolve(__dirname, '..', 'legacy-phones.csv');
        const rawData = fs.readFileSync(dataPath, 'utf8');
        const hashSet = new Set(rawData.split('\n'));

        for (let phoneHash of hashSet) {
            if (phoneHash.length !== 64) {
                continue;
            }

            const model = new LegacyUser({ phoneHash });

            await model.save();
        }
    }
}

module.exports = Main;
