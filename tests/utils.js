const jayson = require('jayson/index');
// TODO: before testing add URL to the local instance registration service as a first parameter
const client = jayson.client.http('');
const fetch = require('node-fetch');
const { Keygen } = require('eosjs-keygen');
const { JsonRpc } = require('cyberwayjs');
const randomstring = require('randomstring');
// TODO: before testing add URL to blockchain as a first parameter
const RPC = new JsonRpc('', { fetch });

function callWrapper(method, data, verbose = false) {
    return new Promise((resolve, reject) => {
        client.request(method, data, (error, response) => {
            if (error) {
                if (verbose) {
                    console.error(`${method} error on send request -- `, error);
                }
                reject(error);
            } else {
                if (response.error) {
                    if (verbose) {
                        console.error(
                            `${method} error in response -- `,
                            JSON.stringify(response.error, null, 2)
                        );
                    }
                    return reject(response.error);
                }
                if (verbose) {
                    console.info(`${method} response --`, JSON.stringify(response.result, null, 2));
                }
                return resolve(response.result);
            }
        });
    });
}

async function getState({ phone, user }, verbose) {
    return await callWrapper('getState', { phone, user }, verbose);
}

async function deleteAccount({ targetPhone, testingPass }, verbose) {
    return await callWrapper('deleteAccount', { targetPhone, testingPass }, verbose);
}

async function firstStep({ phone, testingPass }, verbose) {
    return await callWrapper('firstStep', { phone, testingPass }, verbose);
}

async function verify({ phone, code }, verbose) {
    return await callWrapper('verify', { phone, code }, verbose);
}

async function setUsername({ phone, user }, verbose) {
    return await callWrapper('setUsername', { phone, user }, verbose);
}

async function toBlockChain({ active, owner, user }, verbose) {
    return await callWrapper('toBlockChain', { active, owner, user }, verbose);
}

async function isUsernameOccupied(user) {
    try {
        await RPC.get_account(user);
        return true;
    } catch (error) {
        const errObject = error.json || error;

        if (errObject.code === 500) {
            return false;
        }

        const code = errObject.code || 500;
        const message = errObject.message || 'Unhandled blockchain error';

        throw {
            code,
            message,
            error,
        };
    }
}

async function generateNewUsername() {
    const prefix = 'new-';
    const numPrefix = '90-';

    const accountName =
        prefix +
        numPrefix +
        randomstring.generate({
            length: 5,
            charset: 'alphanumeric',
            capitalization: 'lowercase',
        });

    try {
        const occupied = await isUsernameOccupied(accountName);
        if (occupied) {
            return await generateNewUsername();
        }

        return accountName;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = {
    callWrapper,
    getState,
    deleteAccount,
    firstStep,
    verify,
    setUsername,
    toBlockChain,
    Keygen,
    generateNewUsername,
};
