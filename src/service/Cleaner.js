const core = require('gls-core-service');
const logger = core.Logger;
const stats = core.Stats.client;
const BasicService = core.service.Basic;
const env = require('../env');
const User = require('../model/User');

class Cleaner extends BasicService {
    async start() {
        const interval = env.GLS_CLEANER_INTERVAL_HOURS * 1000 * 60 * 60;

        this.startLoop(interval, interval);
    }

    async stop() {
        await this.stopNested();
    }

    async iteration() {
        logger.info('Start cleaning...');

        const timer = new Date();

        try {
            await Promise.all([
                this._cleanSmsVerify(),
                this._cleanSocialVerify(),
                this._cleanMailVerify(),
            ]);

            stats.timing('cleaning', new Date() - timer);
            logger.info('Cleaning done!');
        } catch (error) {
            stats.increment('cleaning_error');
            logger.error(`Cleaning error - ${error}`);
            process.exit(1);
        }
    }

    async _cleanSmsVerify() {
        // TODO -
    }

    async _cleanSocialVerify() {
        // TODO -
    }

    async _cleanMailVerify() {
        // TODO -
    }
}

module.exports = Cleaner;
