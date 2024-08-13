# Sonic Odyssey Autobot

Welcome to the Sonic Odyssey Autobot project. This bot is designed for automated interaction with the Sonic Odyssey game on the Solana blockchain. It performs various operations including sending transactions, daily logins, claiming boxes, and opening boxes for multiple wallets.

## Features

-Automated transaction sending for multiple wallets
-Configurable number of transactions per wallet (108-120)
-Daily operations automation (login, claim box, open box)
-Progress tracking and resumption capability
-Customizable execution schedule (daily or continuous)
-Interactive configuration menu
-Wallet balance checking functionality
-Manual trigger for daily operations
-Random delays and amounts for natural behavior
-Error handling and retry mechanisms
-Support for multiple private keys
-Modular design with separate utility functions

## Prerequisites

Install Nodejs18
```console
# Check Nodejs Version
node --version
# if 18, skip nodejs steps

# Delete Nodejs old files
sudo apt-get remove nodejs
sudo apt-get purge nodejs
sudo apt-get autoremove
sudo rm /etc/apt/keyrings/nodesource.gpg
sudo rm /etc/apt/sources.list.d/nodesource.list

# Install Nodejs 18
NODE_MAJOR=18
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt-get update
sudo apt-get install -y nodejs
node --version

# Install npm
sudo apt-get install npm
npm --version
```

```console
sudo apt-get install git

sudo apt update & sudo apt upgrade -y
```

## Installation

1. Clone the repository and navigate into the project directory:

   ```bash
   git clone https://github.com/vahidnfc33/sonic-auto-vahidnfcVersion.git && cd sonic-auto-vahidnfcVersion
   ```

3. Install dependencies:

   ```bash
   npm install node-schedule yargs inquirer inquirer colors @solana/web3.js
   ```

4. Prepare input files:

   - Create a `privateKeys.json` file in the root directory and add your private keys:


   Example `privateKeys.json`:
  ```json
  [
    "private-key-1",
    "private-key-2",
    "private-key-3"
  ]
  ```

## Usage

```bash
screen -S sonic
```

To run the bot, use the following command:

```bash
node main.js
```

Ctl + A + D to detach from the screen.

DONE :)

-------------------
## Configuration
To access the configuration menu, run the script with the `-v`  flag:
- Example: `node main.js -v`

# Default Configuration

## ⏰ Daily Run Time
- **Range:** 1-5 UTC
- **Minute:** 0
- **Description:** Sets the time range when the script will run daily

## 🔢 TX Count
- **Range:** 108-120
- **Description:** Defines the range of transactions to be sent per wallet

## ⏳ TX Delay
- **Range:** 4000-15000 ms
- **Description:** Sets the delay between transactions for natural behavior

## 💰 TX Amount Fee
- **Range:** 0.001-0.003 SOL
- **Description:** Specifies the range of SOL to be sent in each transaction

## 🕰️ Daily Timer
- **Status:** Enabled
- **Description:** Determines if the script runs daily or continuously


## Customize settings via the interactive menu:

1. Daily Run Time Range: Set daily script execution window
2. TX Count Range: Define transactions per wallet
3. TX Delay Range: Adjust delay between transactions
4. TX Amount Fee Range: Set SOL amount per transaction
5. Daily Timer: Toggle daily/continuous operation
6. Check Wallet Balances: View all wallet balances
7. Manual Operations: 
   a. Daily Login
   b. Claim Box
   c. Open Box (for all wallets)



## Contributing

Contributions, issue reports, and feature requests are welcome. Please check the Issues page if you want to contribute.

## Disclaimer

This bot is designed for educational purposes only. Please use it at your own risk. The creators are not responsible for any potential losses or issues that may arise from using this bot.
