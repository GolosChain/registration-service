const core = require('gls-core-service');
const Logger = core.utils.Logger;
const env = require('../env');

const STRATEGY_LIST = ['smsFromUser', 'smsToUser', 'mail', 'social'];

class Strategy {
    constructor() {
        this._strategyChoicer = env.GLS_DEFAULT_STRATEGY_CHOICER;
        this._strategyChoicerData = null;
        this._randomSmsStrategyInc = 0;

        const defaultData = env.GLS_DEFAULT_STRATEGY_CHOICER_DATA;

        if (defaultData && typeof defaultData === 'string') {
            this._strategyChoicerData = JSON.parse(defaultData);
        }
    }

    getStrategyChoicer() {
        return {
            choicer: this._strategyChoicer,
            data: this._strategyChoicerData,
        };
    }

    setStrategyChoicer(choicer, data = null) {
        if (!['randomSmsStrategy', 'directStrategy', 'legacy'].includes(choicer)) {
            throw { code: 400, message: 'Bad strategy name' };
        }

        this._strategyChoicer = choicer;
        this._strategyChoicerData = data;
    }

    async choiceStrategy() {
        switch (this._strategyChoicer) {
            case 'randomSmsStrategy':
                if (++this._randomSmsStrategyInc % 2) {
                    return 'smsFromUser';
                } else {
                    return 'smsToUser';
                }

            case 'directStrategy':
                const strategyData = this._strategyChoicerData;

                if (strategyData && STRATEGY_LIST.includes(strategyData.strategy)) {
                    return strategyData.strategy;
                }

                Logger.error(`Invalid strategy data - "${strategyData}", set strategy choicer to legacy.`);

                this._strategyChoicer = 'legacy';
                return this.choiceStrategy();

            case 'legacy':
            default:
                return 'smsFromUser';
        }
    }
}

module.exports = Strategy;
