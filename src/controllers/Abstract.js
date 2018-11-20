const golos = require('golos-js');
const core = require('gls-core-service');
const BlockChainValues = core.utils.BlockChainValues;
const Logger = core.utils.Logger;
const env = require('../data/env');
const locale = require('../data/locale');

class Abstract {
    constructor({ connector }) {
        this.connector = connector;
    }

    async sendTo(...args) {
        return await this.connector.sendTo(...args);
    }

    async getState() {
        throw 'Not implemented';
    }

    async firstStep() {
        throw 'Not implemented';
    }

    async verify() {
        throw 'Not implemented';
    }

    async toBlockChain() {
        throw 'Not implemented';
    }

    async _registerInBlockChain(user, { owner, active, posting, memo }) {
        const jsonMetadata = '{}';
        const extensions = [];
        const chainProps = await golos.api.getChainPropertiesAsync();
        const fee = chainProps.create_account_min_golos_fee;
        const globalProps = await BlockChainValues.getDynamicGlobalProperties();
        const golosDelegation = env.GLS_ACCOUNT_DELEGATION_FEE;
        const vestsDelegation = BlockChainValues.golosToVests(golosDelegation, globalProps);

        await golos.broadcast.accountCreateWithDelegationAsync(
            env.GLS_REGISTRAR_KEY,
            fee,
            `${vestsDelegation.toFixed(6)} GESTS`,
            env.GLS_REGISTRAR_ACCOUNT,
            user,
            this._makeFormedMetaKey(owner),
            this._makeFormedMetaKey(active),
            this._makeFormedMetaKey(posting),
            memo,
            jsonMetadata,
            extensions
        );
    }

    _makeFormedMetaKey(key) {
        return {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [[key, 1]],
        };
    }

    async _sendFinishMail(mail, lang) {
        const upperLang = lang.toUpperCase();

        try {
            await this.sendTo('mail', 'send', {
                from: 'no-reply@golos.io',
                to: mail,
                subject: locale.mail.subject[lang](),
                templateId: env[`GLS_MAIL_FINISH_TEMPLATE_${upperLang}`],
                data: {},
            });
        } catch (error) {
            Logger.error(`Finish mail send error - ${error}`);
            // Not a critical error, continue
        }
    }
}

module.exports = Abstract;
