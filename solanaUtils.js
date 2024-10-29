const {
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
  Keypair,
} = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const base58 = require('bs58');
const colors = require('colors');

const DEVNET_URL = 'https://api.testnet.sonic.game/';
const connection = new Connection(DEVNET_URL, 'confirmed');

async function sendSol(fromKeypair, toPublicKey, amount) {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: new PublicKey(toPublicKey),
        lamports: amount,
      })
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
    console.log(colors.green('Transaction confirmed with signature:'), signature);
    return signature;
  } catch (error) {
    console.error(colors.red('Error sending SOL:'), error.message);
    throw error;
  }
}

function generateRandomAddresses(count) {
  return Array.from({ length: count }, () => Keypair.generate().publicKey.toString());
}

async function getKeypairFromSeed(seedPhrase) {
  try {
    const seed = await bip39.mnemonicToSeed(seedPhrase);
    const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
    return Keypair.fromSeed(derivedSeed.slice(0, 32));
  } catch (error) {
    console.error(colors.red('Error generating keypair from seed:'), error.message);
    throw error;
  }
}

function getKeypairFromPrivateKey(privateKey) {
  try {
    const decodedPrivateKey = base58.decode(privateKey);
    return Keypair.fromSecretKey(decodedPrivateKey);
  } catch (error) {
    console.error(colors.red('Error generating keypair from private key:'), error.message);
    throw error;
  }
}

async function getWalletBalance(publicKey) {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error(colors.red('Error getting wallet balance:'), error.message);
    throw error;
  }
}



const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function airdropSol(publicKey, amount = 1) {
  try {
    const signature = await connection.requestAirdrop(new PublicKey(publicKey), amount * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
    console.log(colors.green(`Airdropped ${amount} SOL to ${publicKey}`));
  } catch (error) {
    console.error(colors.red('Error airdropping SOL:'), error.message);
    throw error;
  }
}

module.exports = {
  sendSol,
  generateRandomAddresses,
  getKeypairFromSeed,
  getKeypairFromPrivateKey,
  getWalletBalance,
  DEVNET_URL,
  connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  delay,
  airdropSol,
};
