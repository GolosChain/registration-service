const core = require('gls-core-service');
const logger = core.Logger;
const Main = require('./Main');

new Main().start().then(
    () => {
        logger.info('Main service started!');
    },
    error => {
        logger.error(`Main service failed - ${error}`);
        process.exit(1);
    }
);