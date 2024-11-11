const fs = require('fs');
require('colors');
const solana = require('@solana/web3.js');
const axios = require('axios').default;
const base58 = require('bs58');
const nacl = require('tweetnacl');
const moment = require('moment');

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));
const apiBaseUrl = 'https://api.testnet.v1.sonic.game';
const connection = new solana.Connection(apiBaseUrl, 'confirmed');

const HEADERS = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getKeypair(privateKey) {
    const decodedPrivateKey = base58.decode(privateKey);
    return solana.Keypair.fromSecretKey(decodedPrivateKey);
}

async function getToken(privateKey) {
    try {
        const keypair = getKeypair(privateKey);
        const { data } = await axios({
            url: `${apiBaseUrl}/auth/sonic/challenge`,
            params: { wallet: keypair.publicKey },
            headers: HEADERS,
        });

        const sign = nacl.sign.detached(Buffer.from(data.data), keypair.secretKey);
        const signature = Buffer.from(sign).toString('base64');
        const encodedPublicKey = Buffer.from(keypair.publicKey.toBytes()).toString('base64');

        const response = await axios({
            url: `${apiBaseUrl}/auth/sonic/authorize`,
            method: 'POST',
            headers: HEADERS,
            data: {
                address: keypair.publicKey,
                address_encoded: encodedPublicKey,
                signature,
            },
        });

        return response.data.data.token;
    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error getting token: ${error}`.red);
        return null;
    }
}

async function getProfile(token) {
    try {
        const { data } = await axios({
            url: `${apiBaseUrl}/user/rewards/info`,
            method: 'GET',
            headers: { ...HEADERS, Authorization: token },
        });
        return data.data;
    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error getting profile: ${error}`.red);
        return null;
    }
}

async function doTransactions(tx, keypair, retries = 3) {
    try {
        const bufferTransaction = tx.serialize();
        const signature = await connection.sendRawTransaction(bufferTransaction);
        await connection.confirmTransaction(signature);
        return signature;
    } catch (error) {
        if (retries > 0) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Retrying transaction... (${retries} retries left)`.yellow);
            await delay(1000);
            return doTransactions(tx, keypair, retries - 1);
        }
        throw error;
    }
}

async function openMysteryBox(token, keypair) {
    try {
        const { data } = await axios({
            url: `${apiBaseUrl}/user/rewards/mystery-box/build-tx`,
            method: 'GET',
            headers: { ...HEADERS, Authorization: token },
        });

        const txBuffer = Buffer.from(data.data.hash, 'base64');
        const tx = solana.Transaction.from(txBuffer);
        tx.partialSign(keypair);

        const signature = await doTransactions(tx, keypair);

        const response = await axios({
            url: `${apiBaseUrl}/user/rewards/mystery-box/open`,
            method: 'POST',
            headers: { ...HEADERS, Authorization: token },
            data: { hash: signature },
        });

        console.log(`[ ${moment().format('HH:mm:ss')} ] Box opened successfully! Amount: ${response.data.data.amount}`.green);
        return response.data;
    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error opening box: ${error}`.red);
        return null;
    }
}

async function fetchDaily(token) {
    try {
        const { data } = await axios({
            url: `${apiBaseUrl}/user/transactions/state/daily`,
            method: 'GET',
            headers: { ...HEADERS, Authorization: token },
        });
        return data.data.total_transactions;
    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error fetching daily: ${error}`.red);
        return 0;
    }
}

async function dailyClaim(token) {
    try {
        const transactions = await fetchDaily(token);
        console.log(`[ ${moment().format('HH:mm:ss')} ] Total transactions: ${transactions}`.blue);

        if (transactions > 10) {
            for (let stage = 1; stage <= 3; stage++) {
                try {
                    const { data } = await axios({
                        url: `${apiBaseUrl}/user/transactions/rewards/claim`,
                        method: 'POST',
                        headers: { ...HEADERS, Authorization: token },
                        data: { stage },
                    });
                    console.log(`[ ${moment().format('HH:mm:ss')} ] Stage ${stage} claimed successfully!`.green);
                    await delay(1000);
                } catch (error) {
                    if (error.response?.data?.code === 100015 || error.response?.data?.code === 100016) {
                        console.log(`[ ${moment().format('HH:mm:ss')} ] Stage ${stage} already claimed`.cyan);
                    } else {
                        console.log(`[ ${moment().format('HH:mm:ss')} ] Error claiming stage ${stage}: ${error}`.red);
                    }
                }
            }
        }
    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error in daily claim: ${error}`.red);
    }
}

async function dailyLogin(token, keypair) {
    try {
        const { data } = await axios({
            url: `${apiBaseUrl}/user/check-in/transaction`,
            method: 'GET',
            headers: { ...HEADERS, Authorization: token },
        });

        const txBuffer = Buffer.from(data.data.hash, 'base64');
        const tx = solana.Transaction.from(txBuffer);
        tx.partialSign(keypair);

        const signature = await doTransactions(tx, keypair);

        const response = await axios({
            url: `${apiBaseUrl}/user/check-in`,
            method: 'POST',
            headers: { ...HEADERS, Authorization: token },
            data: { hash: signature },
        });

        console.log(`[ ${moment().format('HH:mm:ss')} ] Daily login successful!`.green);
        return response.data;
    } catch (error) {
        if (error.response?.data?.message === 'current account already checked in') {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Already checked in today`.cyan);
        } else {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Error in daily login: ${error}`.red);
        }
        return null;
    }
}

async function processWallet(privateKey) {
    try {
        const token = await getToken(privateKey);
        if (!token) return;

        const publicKey = getKeypair(privateKey).publicKey.toBase58();
        console.log(`\n[ ${moment().format('HH:mm:ss')} ] Processing wallet: ${publicKey}`.cyan);

        await dailyLogin(token, getKeypair(privateKey));
        await delay(2000);

        await dailyClaim(token);
        await delay(2000);

        const profile = await getProfile(token);
        if (profile && profile.ring_monitor > 0) {
            console.log(`[ ${moment().format('HH:mm:ss')} ] Found ${profile.ring_monitor} boxes to open`.yellow);
            for (let i = 0; i < profile.ring_monitor; i++) {
                await openMysteryBox(token, getKeypair(privateKey));
                await delay(2000);
            }
        }

    } catch (error) {
        console.log(`[ ${moment().format('HH:mm:ss')} ] Error processing wallet: ${error}`.red);
    }
}

(async () => {
    console.log(`[ ${moment().format('HH:mm:ss')} ] Starting process for ${PRIVATE_KEYS.length} wallets...`.cyan);
    
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        await processWallet(PRIVATE_KEYS[i]);
        await delay(3000);
    }
    
    console.log(`\n[ ${moment().format('HH:mm:ss')} ] All wallets processed!`.green);
})();
