const fs = require('fs');
const readlineSync = require('readline-sync');
const colors = require('colors');

const {
  sendSol,
  generateRandomAddresses,
  getKeypairFromSeed,
  getKeypairFromPrivateKey,
  PublicKey,
  connection,
  LAMPORTS_PER_SOL,
  delay,
} = require('./src/solanaUtils');

const { displayHeader } = require('./src/displayUtils');

(async () => {
  displayHeader();
  const method = '1';

  let seedPhrasesOrKeys;
 if (method === '1') {
    seedPhrasesOrKeys = JSON.parse(
      fs.readFileSync('privateKeys.json', 'utf-8')
    );
    if (!Array.isArray(seedPhrasesOrKeys) || seedPhrasesOrKeys.length === 0) {
      throw new Error(
        colors.red('privateKeys.json is not set correctly or is empty')
      );
    }
  } 

  const defaultAddressCount = 100;
  const addressCountInput = 100;
  const addressCount = addressCountInput
    ? parseInt(addressCountInput, 10)
    : defaultAddressCount;

  if (isNaN(addressCount) || addressCount <= 0) {
    throw new Error(colors.red('Invalid number of addresses specified'));
  }

  const randomAddresses = generateRandomAddresses(addressCount);

  let rentExemptionAmount;
  try {
    rentExemptionAmount =
      (await connection.getMinimumBalanceForRentExemption(0)) /
      LAMPORTS_PER_SOL;
    console.log(
      colors.yellow(
        `Minimum balance required for rent exemption: ${rentExemptionAmount} SOL`
      )
    );
  } catch (error) {
    console.error(
      colors.red(
        'Failed to fetch minimum balance for rent exemption. Using default value.'
      )
    );
    rentExemptionAmount = 0.001;
  }

		
function amountToSend_rand(){
    let amountToSend;
	
	const amountInput = (Math.random() * (0.0030 - 0.00100) + 0.00100).toFixed(4);
console.log(`random amount to send:${amountInput}`);
    amountToSend = amountInput ? parseFloat(amountInput) : 0.001;

    if (isNaN(amountToSend) || amountToSend < rentExemptionAmount) {
      console.log(
        colors.red(
          `Invalid amount specified. The amount must be at least ${rentExemptionAmount} SOL to avoid rent issues.`
        )
      );
      console.log(
        colors.yellow(
          `Suggested amount to send: ${Math.max(
            0.001,
            rentExemptionAmount
          )} SOL`
        )
      );
    }
  
return amountToSend;
}

function delay_rand(){
  const defaultDelay = 1000;
  const delayInput = Math.floor(Math.random() * (20000 - 1000 + 1) + 1000);
  const currentTime = new Date(); 
  console.log(`Date: ${currentTime}`);
console.log(`random delay time in milliseconds: ${delayInput}`);
  return delayBetweenTx = delayInput ? parseInt(delayInput, 10) : defaultDelay;

}
  

  for (const [index, seedOrKey] of seedPhrasesOrKeys.entries()) {
    let fromKeypair;
    if (method === '0') {
      fromKeypair = await getKeypairFromSeed(seedOrKey);
    } else {
      fromKeypair = getKeypairFromPrivateKey(seedOrKey);
    }
    console.log(
      colors.yellow(
        `Sending SOL from account ${
          index + 1
        }: ${fromKeypair.publicKey.toString()}`
      )
    );

    for (const address of randomAddresses) {
      const toPublicKey = new PublicKey(address);
	  const amnt = amountToSend_rand();
      try {
        await sendSol(fromKeypair, toPublicKey, amnt);
        console.log(
          colors.green(`Successfully sent ${amnt} SOL to ${address}`)
        );
      } catch (error) {
        console.error(colors.red(`Failed to send SOL to ${address}:`), error);
      }
      await delay(delay_rand());
    }
  }
})();
