const core = require('gls-core-service');
const BasicController = core.controllers.Basic;
const Logger = core.utils.Logger;
const env = require('../data/env');
const locale = require('../data/locale');
const { JsonRpc, Api } = require('cyberwayjs');
const JsSignatureProvider = require('cyberwayjs/dist/eosjs-jssig').default;
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('text-encoding');

const rpc = new JsonRpc(env.GLS_CYBERWAY_CONNECT, { fetch });
const signatureProvider = new JsSignatureProvider([env.GLS_REGISTRAR_KEY, env.GLS_CREATOR_KEY]);

const api = new Api({
    rpc,
    signatureProvider,
    textDecoder: new TextDecoder(),
    textEncoder: new TextEncoder(),
});

const transactionOptions = {
    providebw: true,
    broadcast: false,
    blocksBehind: 5,
    expireSeconds: 3600,
    keyProvider: [env.GLS_REGISTRAR_KEY],
};

class Abstract extends BasicController {
    async firstStep() {
        throw 'Not implemented';
    }

    async verify() {
        throw 'Not implemented';
    }

    async toBlockChain() {
        throw 'Not implemented';
    }

    _isActual() {
        return true;
    }

    async _registerInBlockChain(name, alias, { owner, active }) {
        const transaction = this._generateRegisterTransaction(name, alias, { owner, active });
        const trx = await api.transact(transaction, transactionOptions);
        return await api.pushSignedTransaction(trx);
    }

    _generateRegisterTransaction(name, alias, { owner, active }) {
        return {
            actions: [
                {
                    account: env.GLS_REGISTRAR_ACCOUNT,
                    name: 'newaccount',
                    authorization: [
                        {
                            actor: env.GLS_REGISTRAR_ACCOUNT,
                            permission: 'createuser',
                        },
                    ],
                    data: {
                        creator: env.GLS_REGISTRAR_ACCOUNT,
                        name,
                        owner: this._generateAuthorityObject(owner),
                        active: this._generateAuthorityObject(active),
                    },
                },
                {
                    account: 'cyber.domain',
                    name: 'newusername',
                    authorization: [
                        {
                            actor: env.GLS_CREATOR_NAME,
                            permission: 'active',
                        },
                    ],
                    data: {
                        creator: env.GLS_CREATOR_NAME,
                        name: alias,
                        owner: name,
                    },
                },
            ],
        };
    }

    _generateAuthorityObject(key) {
        return { threshold: 1, keys: [{ key, weight: 1 }], accounts: [], waits: [] };
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
