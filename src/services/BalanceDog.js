const sleep = require('then-sleep');
const golos = require('golos-js');
const core = require('gls-core-service');
const BasicService = core.services.Basic;
const Logger = core.utils.Logger;
const BlockChainValues = core.utils.BlockChainValues;
const env = require('../data/env');

class BalanceDog extends BasicService {
    constructor(connector) {
        super();

        this._connector = connector;
        this._inIteration = false;
    }

    async start() {
        this.startLoop(0, env.GLS_BALANCE_CHECK_INTERVAL);
    }

    async stop() {
        this.done();
        this.stopLoop();

        while (this._inIteration) {
            await sleep(0);
        }
    }

    async iteration() {
        if (this.isDone()) {
            return;
        }

        this._inIteration = true;

        try {
            const { golosFee, golosPowerFee } = await this._getRegistrationFees();
            const { golosBalance, golosPowerBalance } = await this._getRegistrationBalance();
            const { minGolos, minGolosPower } = this._getMinBalance(golosFee, golosPowerFee);

            if (golosBalance < minGolos || golosPowerBalance < minGolosPower) {
                await this._tryDisableRegistration();
            } else {
                await this._tryEnableRegistration();
            }
        } catch (error) {
            Logger.error(`Balance dog error, but continue - ${error}`);
        }

        this._inIteration = false;
    }

    async _getRegistrationFees() {
        const chainProps = await golos.api.getChainPropertiesAsync();
        const golosFee = parseFloat(chainProps.create_account_min_golos_fee);
        const golosPowerFee = parseFloat(env.GLS_ACCOUNT_DELEGATION_FEE);

        return {
            golosFee,
            golosPowerFee,
        };
    }

    async _getRegistrationBalance() {
        const globalProps = await BlockChainValues.getDynamicGlobalProperties();
        const rawAccountResponse = await golos.api.getAccountsAsync([env.GLS_REGISTRAR_ACCOUNT]);
        const rawAccount = rawAccountResponse[0];
        const {
            balance: rawGolos,
            savings_balance: rawSave,
            vesting_shares: rawVesting,
            delegated_vesting_shares: rawDelegatedVesting,
        } = rawAccount;

        const golosBalance = parseFloat(rawGolos) - parseFloat(rawSave);
        const vestingBalance = parseFloat(rawVesting) - parseFloat(rawDelegatedVesting);
        const golosPowerBalance = BlockChainValues.vestsToGolos(vestingBalance, globalProps);

        return {
            golosBalance,
            golosPowerBalance,
        };
    }

    _getMinBalance(golosFee, golosPowerFee) {
        const bankruptMul = env.GLS_MIN_REGISTRATIONS_BEFORE_BANKRUPT;

        return {
            minGolos: golosFee * bankruptMul,
            minGolosPower: golosPowerFee * bankruptMul,
        };
    }

    async _tryEnableRegistration() {
        if (!this._connector.isRegistrationEnabledDirect()) {
            this._connector.enableRegistrationDirect();
            Logger.info('Registration balance is ok, enable registration.');
        }
    }

    async _tryDisableRegistration() {
        if (this._connector.isRegistrationEnabledDirect()) {
            this._connector.disableRegistrationDirect();
            Logger.info('Registration balance is to low, disable registration!');
        }
    }
}

module.exports = BalanceDog;
