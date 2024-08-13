    const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const colors = require('colors');
const readline = require('readline');
const { 
    sendSol, 
    generateRandomAddresses, 
    getKeypairFromPrivateKey, 
    getWalletBalance,
    delay,
    PublicKey
} = require('./solanaUtils');

console.clear();
console.log(`${'='.repeat(80)}`.cyan);
console.log(`${'='.repeat(80)}`.cyan);
console.log(`${' '.repeat(20)}Sonic Odyssey - VAHID NFC Edition`.cyan.bold);
console.log(`${'='.repeat(80)}`.cyan);
console.log(`${'='.repeat(80)}`.cyan);
console.log("\n");

let PRIVATE_KEYS = [];
const CONFIG_FILE = 'config.json';
const PROGRESS_FILE = 'progress.json';
let CONFIG = {
    EXECUTION_HOUR_MIN: 1,
    EXECUTION_HOUR_MAX: 5,
    EXECUTION_MINUTE: 0,
    MIN_TRANSACTIONS: 108,
    MAX_TRANSACTIONS: 120,
    MIN_DELAY: 4000,
    MAX_DELAY: 15000,
    MIN_AMOUNT: 0.001,
    MAX_AMOUNT: 0.003,
    USE_DAILY_TIMER: true
};

let PROGRESS = {
    currentWalletIndex: 0,
    currentTransactionIndex: 0,
    privateKeysHash: '',
    successfulTransactions: 0,
    failedTransactions: 0
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function calculateHash(data) {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

async function loadOrCreatePrivateKeys() {
    const PRIVATE_KEYS_FILE = 'privateKeys.json';
    console.log(`Attempting to load private keys from ${PRIVATE_KEYS_FILE}...`.yellow);
    
    if (!fs.existsSync(PRIVATE_KEYS_FILE)) {
        console.log(`${PRIVATE_KEYS_FILE} not found. Creating an empty file...`.yellow);
        fs.writeFileSync(PRIVATE_KEYS_FILE, '[]');
        console.log(`${PRIVATE_KEYS_FILE} has been created. Please edit this file and add your private keys as a JSON array.`.green);
        console.log(`Example format: ["privateKey1", "privateKey2", "privateKey3"]`.cyan);
        console.log(`After adding your keys, please run the script again.`.yellow);
        process.exit(0);
    }
    
    try {
        const fileContent = fs.readFileSync(PRIVATE_KEYS_FILE, 'utf-8');
        console.log(`File content: ${fileContent.substring(0, 50)}...`.gray); // Log the first 50 characters
        PRIVATE_KEYS = JSON.parse(fileContent);
        if (PRIVATE_KEYS.length === 0) {
            console.error(`No private keys found in ${PRIVATE_KEYS_FILE}. Please add your private keys and try again.`.red);
            process.exit(1);
        }
        console.log(`Loaded ${PRIVATE_KEYS.length} private keys from ${PRIVATE_KEYS_FILE}`.green);
    } catch (error) {
        console.error(`Error reading or parsing ${PRIVATE_KEYS_FILE}: ${error}`.red);
        console.log('Please make sure the file contains a valid JSON array of private keys.'.yellow);
        process.exit(1);
    }
}

async function loadOrCreateProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            PROGRESS = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            console.log(`Loaded progress from ${PROGRESS_FILE}`.green);
        } catch (error) {
            console.error(`Error reading ${PROGRESS_FILE}: ${error}`.red);
            console.log('Creating new progress file.'.yellow);
            PROGRESS = {
                currentWalletIndex: 0,
                currentTransactionIndex: 0,
                privateKeysHash: calculateHash(PRIVATE_KEYS),
                successfulTransactions: 0,
                failedTransactions: 0
            };
        }
    } else {
        console.log(`${PROGRESS_FILE} not found. Creating new progress file.`.yellow);
        PROGRESS = {
            currentWalletIndex: 0,
            currentTransactionIndex: 0,
            privateKeysHash: calculateHash(PRIVATE_KEYS),
            successfulTransactions: 0,
            failedTransactions: 0
        };
    }
    if (PROGRESS.privateKeysHash !== calculateHash(PRIVATE_KEYS)) {
        console.log('Private keys have changed. Resetting progress.'.yellow);
        PROGRESS = {
            currentWalletIndex: 0,
            currentTransactionIndex: 0,
            privateKeysHash: calculateHash(PRIVATE_KEYS),
            successfulTransactions: 0,
            failedTransactions: 0
        };
    }
    saveProgress();
}

function saveProgress() {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(PROGRESS, null, 2));
}

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const loadedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
            CONFIG = { ...CONFIG, ...loadedConfig };
            console.log(`Loaded configuration from ${CONFIG_FILE}`.green);
        } catch (error) {
            console.error(`Error reading ${CONFIG_FILE}: ${error}`.red);
            console.log('Using default configuration.'.yellow);
        }
    } else {
        console.log(`${CONFIG_FILE} not found. Using default configuration.`.yellow);
        saveConfig();
    }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(CONFIG, null, 2));
    console.log('Configuration saved.'.green);
}

function displayCurrentConfig(config) {
    console.log('Current Configuration:'.magenta.bold);
    console.log('⏰ ' + 'Daily Run Time:'.cyan + ` ${config.EXECUTION_HOUR_MIN}-${config.EXECUTION_HOUR_MAX} UTC, Minute: ${config.EXECUTION_MINUTE}`);
    console.log('   ' + '(Sets the time range when the script will run daily)'.gray);
    console.log('🔢 ' + 'TX Count:'.cyan + ` ${config.MIN_TRANSACTIONS}-${config.MAX_TRANSACTIONS}`);
    console.log('   ' + '(Defines the range of transactions to be sent per wallet)'.gray);
    console.log('⏳ ' + 'TX Delay:'.cyan + ` ${config.MIN_DELAY}-${config.MAX_DELAY} ms`);
    console.log('   ' + '(Sets the delay between transactions for natural behavior)'.gray);
    console.log('💰 ' + 'TX Amount Fee:'.cyan + ` ${config.MIN_AMOUNT}-${config.MAX_AMOUNT} SOL`);
    console.log('   ' + '(Specifies the range of SOL to be sent in each transaction)'.gray);
    console.log('🕰️ ' + 'Daily Timer:'.cyan + ` ${config.USE_DAILY_TIMER ? 'Enabled' : 'Disabled'}`);
    console.log('   ' + '(Determines if the script runs daily or continuously)'.gray);
}

async function viewWalletBalances() {
    console.log('\nFetching wallet balances...'.yellow);
    
    if (!PRIVATE_KEYS || PRIVATE_KEYS.length === 0) {
        console.log('No private keys found. Attempting to load...'.yellow);
        await loadOrCreatePrivateKeys();
        if (!PRIVATE_KEYS || PRIVATE_KEYS.length === 0) {
            console.log('Failed to load private keys. Please check your privateKeys.json file.'.red);
            await new Promise(resolve => setTimeout(resolve, 3000));
            return;
        }
    }
    console.log('='.repeat(80).cyan);
    console.log('Wallet Balances:'.cyan.bold);
    console.log('='.repeat(80).cyan);
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        try {
            const keypair = getKeypairFromPrivateKey(PRIVATE_KEYS[i]);
            if (keypair) {
                const balance = await getWalletBalance(keypair.publicKey.toString());
                let colorFunction;
                if (balance < 0.1) {
                    colorFunction = str => str.red;
                } else if (balance >= 0.1 && balance <= 0.4) {
                    colorFunction = str => str.yellow;
                } else {
                    colorFunction = str => str.green;
                }
                console.log(colorFunction(`${i + 1}- ${keypair.publicKey.toString()} | Balance: ${balance.toFixed(6)} SOL`));
            } else {
                console.log(`${i + 1}- Invalid private key`.red);
            }
        } catch (error) {
            console.log(`${i + 1}- Error: ${error.message}`.red);
        }
        console.log('-'.repeat(80).gray);
        await delay(500);
    }
    console.log('\nPress Enter to return to the main menu...'.yellow);
    await new Promise(resolve => rl.question('', resolve));
}

async function performDailyOperationsForAllWallets() {
    console.log("\n🔄 Performing daily operations for all wallets...".cyan.bold);
    
    console.log("\nRunning daily login for all wallets...".yellow);
    await runCommand('node dailylogin.js');
    await delay(5000);

    console.log("\nClaiming boxes for all wallets...".yellow);
    await runCommand('node claimbox.js');
    await delay(5000);

    console.log("\nOpening boxes for all wallets...".yellow);
    await runCommand('node openbox.js');
    
    console.log("\n✅ Daily operations completed for all wallets".green.bold);
}

async function showConfigMenu() {
    loadConfig();
    let configChanged = false;
    while (true) {
        console.clear();
        console.log('\n=== Configuration Menu ==='.cyan.bold);
        console.log('Customize the behavior of the Sonic Odyssey Autobot:'.yellow);
        console.log('='.repeat(50).cyan);
        console.log('1.'.green + ' Daily Run Time Range'.white.bold);
        console.log('2.'.green + ' TX Count Range'.white.bold);
        console.log('3.'.green + ' TX Delay Range'.white.bold);
        console.log('4.'.green + ' TX Amount Fee Range'.white.bold);
        console.log('5.'.green + ' Daily Timer'.white.bold);
        console.log('6.'.green + ' Check Wallet Balances'.white.bold);
        console.log('7.'.green + ' Manually Dailylogin,Claimbox,Openbox for All Wallets'.white.bold);
        console.log('8.'.green + ' Exit'.white.bold);
        console.log('='.repeat(50).cyan);
        
        displayCurrentConfig(CONFIG);
        
        console.log('='.repeat(50).cyan);
        const choice = await question('Enter your choice (1-8): '.cyan);
        switch (choice) {
            case '1':
                CONFIG.EXECUTION_HOUR_MIN = parseInt(await question(`Enter minimum execution hour (UTC, 0-23) [${CONFIG.EXECUTION_HOUR_MIN}]: `.yellow)) || CONFIG.EXECUTION_HOUR_MIN;
                CONFIG.EXECUTION_HOUR_MAX = parseInt(await question(`Enter maximum execution hour (UTC, 0-23) [${CONFIG.EXECUTION_HOUR_MAX}]: `.yellow)) || CONFIG.EXECUTION_HOUR_MAX;
                CONFIG.EXECUTION_MINUTE = parseInt(await question(`Enter execution minute (0-59) [${CONFIG.EXECUTION_MINUTE}]: `.yellow)) || CONFIG.EXECUTION_MINUTE;
                saveConfig();
                configChanged = true;
                console.clear();
                break;
            case '2':
                CONFIG.MIN_TRANSACTIONS = parseInt(await question(`Enter minimum number of transactions [${CONFIG.MIN_TRANSACTIONS}]: `.yellow)) || CONFIG.MIN_TRANSACTIONS;
                CONFIG.MAX_TRANSACTIONS = parseInt(await question(`Enter maximum number of transactions [${CONFIG.MAX_TRANSACTIONS}]: `.yellow)) || CONFIG.MAX_TRANSACTIONS;
                saveConfig();
                configChanged = true;
                console.clear();
                break;
            case '3':
                CONFIG.MIN_DELAY = parseInt(await question(`Enter minimum delay (ms) [${CONFIG.MIN_DELAY}]: `.yellow)) || CONFIG.MIN_DELAY;
                CONFIG.MAX_DELAY = parseInt(await question(`Enter maximum delay (ms) [${CONFIG.MAX_DELAY}]: `.yellow)) || CONFIG.MAX_DELAY;
                saveConfig();
                configChanged = true;
                console.clear();
                break;
            case '4':
                CONFIG.MIN_AMOUNT = parseFloat(await question(`Enter minimum amount (SOL) [${CONFIG.MIN_AMOUNT}]: `.yellow)) || CONFIG.MIN_AMOUNT;
                CONFIG.MAX_AMOUNT = parseFloat(await question(`Enter maximum amount (SOL) [${CONFIG.MAX_AMOUNT}]: `.yellow)) || CONFIG.MAX_AMOUNT;
                saveConfig();
                configChanged = true;
                console.clear();
                break;
            case '5':
                CONFIG.USE_DAILY_TIMER = (await question(`Enable daily timer? (y/n) [${CONFIG.USE_DAILY_TIMER ? 'y' : 'n'}]: `.yellow)).toLowerCase() === 'y';
                saveConfig();
                configChanged = true;
                console.clear();
                break;
            case '6':
                await viewWalletBalances();
                console.clear();
                break;
            case '7':
                await performDailyOperationsForAllWallets();
                console.clear();
                break;
            case '8':
                if (configChanged) {
                    console.log('Configuration changes have been saved.'.green);
                } else {
                    console.log('No changes were made to the configuration.'.yellow);
                }
                return;
            default:
                console.log('Invalid choice. Please try again.'.red);
                await new Promise(resolve => setTimeout(resolve, 1500));
                console.clear();
        }
        if (configChanged) {
            console.log('Changes saved successfully.'.green);
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.clear();
        }
    }
}


function getRandomDelay() {
    return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY + 1) + CONFIG.MIN_DELAY);
}

function getRandomAmount() {
    return (Math.random() * (CONFIG.MAX_AMOUNT - CONFIG.MIN_AMOUNT) + CONFIG.MIN_AMOUNT).toFixed(6);
}

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing ${command}: ${error}`.red);
                resolve(false);
            } else {
                console.log(`${command} executed successfully`.green);
                resolve(true);
            }
        });
    });
}

async function sendTransaction(keypair, address, retries = 3) {
    const amount = getRandomAmount();
    const lamports = Math.round(parseFloat(amount) * 1e9);
    
    // Check balance before attempting to send
    const balance = await getWalletBalance(keypair.publicKey);
    if (balance < 0.005) {
        console.error(`❌ Insufficient balance in wallet ${keypair.publicKey.toString()}`.red);
        console.log(`💡 Your wallet balance is too low. Please get SOL faucet from: https://faucet.sonic.game`.yellow);
        return 0;  // Return 0 to indicate failure due to insufficient funds
    }

    for (let i = 0; i < retries; i++) {
        try {
            await sendSol(keypair, new PublicKey(address), lamports);
            return parseFloat(amount);
        } catch (error) {
            if (error.message.includes('insufficient lamports') || error.message.includes('custom program error: 0x1')) {
                console.error(`❌ Insufficient funds in wallet ${keypair.publicKey.toString()}`.red);
                console.log(`💡 Your wallet balance is too low. Please get SOL faucet from: https://faucet.sonic.game`.yellow);
                return 0;
            }
            console.error(`Error sending SOL (attempt ${i + 1}/${retries}): ${error}`.red);
            if (i < retries - 1) await delay(5000);
        }
    }
    console.error(`Failed to send transaction after ${retries} attempts`.red);
    return 0;
}



async function processWallet(privateKey, walletIndex, totalWallets) {
    const keypair = getKeypairFromPrivateKey(privateKey);
    console.log(`\n${'='.repeat(80)}`.cyan);
    
    let initialBalance = await getWalletBalance(keypair.publicKey);
    console.log(`Processing wallet ${walletIndex + 1}/${totalWallets}:`.cyan.bold);
    console.log(`Address: ${keypair.publicKey.toString()}`.yellow);
    console.log(`Initial Balance: ${initialBalance.toFixed(6)} SOL`.green);
    
    console.log(`${'='.repeat(80)}`.cyan);

    if (initialBalance < CONFIG.MIN_WALLET_BALANCE) {
        console.error(`❌ Insufficient balance to process transactions`.red);
        console.log(`💡 Your wallet balance is too low. Please get SOL faucet from: https://faucet.sonic.game`.yellow);
        console.log(`Skipping this wallet and moving to the next one.`.yellow);
        return;
    }

    try {
        const targetTransactionCount = Math.floor(Math.random() * (CONFIG.MAX_TRANSACTIONS - CONFIG.MIN_TRANSACTIONS + 1)) + CONFIG.MIN_TRANSACTIONS;
        const randomAddresses = generateRandomAddresses(targetTransactionCount);
        
        console.log(`Attempting to send ${targetTransactionCount} transactions...`.yellow);
        let successfulTransactions = 0;
        let failedTransactions = 0;
        let totalAmountSent = 0;
        let insufficientBalanceCount = 0;
        
        for (let i = PROGRESS.currentTransactionIndex; i < targetTransactionCount; i++) {
            const address = randomAddresses[i];
            try {
                const amountSent = await sendTransaction(keypair, address);
                if (amountSent > 0) {
                    successfulTransactions++;
                    totalAmountSent += amountSent;
                    console.log(`✅ Transaction ${i + 1}/${targetTransactionCount}:`.green + ` Sent `.cyan + `${amountSent.toFixed(6)} SOL`.yellow + ` to ${address}`.cyan);
                    initialBalance -= amountSent; // Update balance
                } else {
                    failedTransactions++;
                    insufficientBalanceCount++;
                    console.log(`❌ Transaction ${i + 1}/${targetTransactionCount}: Failed to send due to insufficient balance`.red);
                    console.log(`⚠️ Insufficient balance error count: ${insufficientBalanceCount}/10 (Will move to next wallet at 10)`.yellow);
                    if (insufficientBalanceCount >= 10) {
                        console.log(`🛑 Reached 10 insufficient balance errors. Moving to the next wallet.`.red.bold);
                        break;
                    }
                    if (failedTransactions === 1) {
                        console.log(`💡 If you're seeing repeated failures, consider getting SOL faucet from: https://faucet.sonic.game`.yellow);
                    }
                }
            } catch (error) {
                failedTransactions++;
                console.error(`❌ Transaction ${i + 1}/${targetTransactionCount}: Failed to send`.red);
                console.error(`Error details: ${error.message}`.red);
            }

            console.log(`${'─'.repeat(80)}`.gray);
            console.log(`TX Progress: `.cyan + `${i + 1}/${targetTransactionCount}`.yellow + ` | Successful: `.cyan + `${successfulTransactions}`.green + ` | Failed: `.cyan + `${failedTransactions}`.red + ` | Total sent: `.cyan + `${totalAmountSent.toFixed(6)} SOL`.yellow);
            console.log(`Current wallet: `.cyan + `${walletIndex + 1}/${totalWallets}`.magenta + ` | Address: `.cyan + `${keypair.publicKey.toString()}`.yellow + ` | Estimated Balance: `.cyan + `${initialBalance.toFixed(6)} SOL`.green);
            console.log(`${'─'.repeat(80)}`.gray);
            
            PROGRESS.currentTransactionIndex = i + 1;
            PROGRESS.successfulTransactions += successfulTransactions;
            PROGRESS.failedTransactions += failedTransactions;
            saveProgress();
            
            if (insufficientBalanceCount >= 10) break;
            
            await delay(getRandomDelay());
        }
        
        // Get final balance
        const finalBalance = await getWalletBalance(keypair.publicKey);
        console.log(`\nFinal wallet balance: ${finalBalance.toFixed(6)} SOL`.green);
        
        console.log(`\nTransactions summary:`.yellow);
        console.log(`Total transactions attempted: `.cyan + `${targetTransactionCount}`.yellow);
        console.log(`Successful transactions: `.cyan + `${successfulTransactions}`.green);
        console.log(`Failed transactions: `.cyan + `${failedTransactions}`.red);
        console.log(`Total amount sent: `.cyan + `${totalAmountSent.toFixed(6)} SOL`.yellow);
        console.log(`Balance change: `.cyan + `${(initialBalance - finalBalance).toFixed(6)} SOL`.yellow);
        
        console.log(`\nFinished processing wallet: ${keypair.publicKey.toString()}`.green.bold);
        
        PROGRESS.currentWalletIndex++;
        PROGRESS.currentTransactionIndex = 0;
        saveProgress();
    } catch (error) {
        console.error(`Error processing wallet ${keypair.publicKey.toString()}: ${error}`.red);
    }
}



async function processAllWallets() {
    console.log("\n🚀 Starting wallet processing...".cyan.bold);
    for (let i = PROGRESS.currentWalletIndex; i < PRIVATE_KEYS.length; i++) {
        await processWallet(PRIVATE_KEYS[i], i, PRIVATE_KEYS.length);
        if (i < PRIVATE_KEYS.length - 1) {
            console.log("\nWaiting 1 minute before processing next wallet...".yellow);
            await delay(60000);
        }
    }
    console.log("\n✅ All wallets processed".green.bold);
    console.log(`Total successful transactions: ${PROGRESS.successfulTransactions}`.green);
    console.log(`Total failed transactions: ${PROGRESS.failedTransactions}`.red);
    
    PROGRESS.currentWalletIndex = 0;
    PROGRESS.currentTransactionIndex = 0;
    saveProgress();

    // Perform daily operations for all wallets
    await performDailyOperationsForAllWallets();
}

async function scheduleNextExecution() {
    if (!CONFIG.USE_DAILY_TIMER) {
        console.log("\n🔄 Daily timer is disabled. Scheduling next execution in 30 minutes...".yellow);
        setTimeout(async () => {
            console.log("\n⏰ 30 minutes have passed. Restarting the process...".cyan);
            await processAllWallets();
            scheduleNextExecution(); // Schedule the next execution
        }, 30 * 60 * 1000); // 30 minutes in milliseconds
        return;
    }

    const now = new Date();
    const executionHour = Math.floor(Math.random() * (CONFIG.EXECUTION_HOUR_MAX - CONFIG.EXECUTION_HOUR_MIN + 1)) + CONFIG.EXECUTION_HOUR_MIN;
    const nextExecution = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), executionHour, CONFIG.EXECUTION_MINUTE);
    
    if (nextExecution <= now) {
        nextExecution.setDate(nextExecution.getDate() + 1);
    }
    const timeUntilNextExecution = nextExecution - now;
    console.log(`\n🕒 Next execution scheduled for ${nextExecution.toUTCString()}`.cyan.bold);
    console.log(`⏳ Time until next execution: ${Math.floor(timeUntilNextExecution / 3600000)} hours and ${Math.floor((timeUntilNextExecution % 3600000) / 60000)} minutes`.cyan);
    setTimeout(async () => {
        await processAllWallets();
        scheduleNextExecution();
    }, timeUntilNextExecution);
}

async function main() {
    try {
        console.clear();
        console.log(`${'='.repeat(80)}`.cyan);
        console.log(`${'='.repeat(80)}`.cyan);
        console.log(`${' '.repeat(20)}Sonic Odyssey - VAHID NFC Edition`.cyan.bold);
        console.log(`${'='.repeat(80)}`.cyan);
        console.log(`${'='.repeat(80)}`.cyan);
        console.log("\n");
        loadConfig();
        await loadOrCreatePrivateKeys();
        await loadOrCreateProgress();
        PROGRESS = { ...PROGRESS, successfulTransactions: PROGRESS.successfulTransactions || 0, failedTransactions: PROGRESS.failedTransactions || 0 };
        console.log("\n🤖 Sonic Odyssey Autobot started".green.bold);
        displayCurrentConfig(CONFIG);
        console.log('\n💡 ' + 'You can change these settings by running:'.yellow + ' node main.js -v'.green);
        
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        if (CONFIG.USE_DAILY_TIMER) {
            if (currentHour >= CONFIG.EXECUTION_HOUR_MIN && currentHour <= CONFIG.EXECUTION_HOUR_MAX) {
                console.log("\n⚡ It's within the execution time range. Starting process now...".yellow.bold);
                await processAllWallets();
            }
            scheduleNextExecution();
        } else {
            console.log("\n⚡ Daily timer is disabled. Starting process immediately...".yellow.bold);
            await processAllWallets();
            scheduleNextExecution(); // This will now schedule the next execution in 30 minutes
        }
    } catch (error) {
        console.error("An error occurred in the main function:".red, error);
    }
}

async function start() {
    try {
        if (process.argv.includes('-v') || process.argv.includes('--verbose')) {
            await showConfigMenu();
            rl.close();
            process.exit(0);
        } else {
            await main();
        }
    } catch (error) {
        console.error('An error occurred in start function:', error);
        rl.close();
        process.exit(1);
    }
}

start().catch(error => {
    console.error('An unexpected error occurred:', error);
    rl.close();
    process.exit(1);
});
