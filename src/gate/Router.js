const core = require('gls-core-service');
const Gate = core.service.Gate;

class Router extends Gate {
    async start() {
        // TODO -

        await super.start({
            serverRoutes: {
                register: null
            }
        });
    }

    // TODO -
}

module.exports = Router;