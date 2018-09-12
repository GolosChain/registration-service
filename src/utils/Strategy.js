const core = require('gls-core-service');
const Logger = core.utils.Logger;

const STRATEGY_LIST = ['smsFromUser', 'smsToUser', 'mail', 'social'];

class Strategy {
    constructor() {
        this._strategyChoicer = 'legacy';
        this._strategyChoicerData = null;
        this._randomSmsStrategyInc = 0;
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
                const strategy = this._strategyChoicerData;

                if (STRATEGY_LIST.includes(strategy)) {
                    return strategy;
                }

                Logger.error(`Invalid strategy - "${strategy}", set strategy choicer to legacy.`);

                this._strategyChoicer = 'legacy';
                return this.choiceStrategy();

            case 'legacy':
            default:
                return 'smsFromUser';
        }
    }
}

module.exports = Strategy;
