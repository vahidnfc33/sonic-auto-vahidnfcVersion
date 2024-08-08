require('colors');

function displayHeader() {
  process.stdout.write('\x1Bc');
  console.log('========================================'.cyan);
  console.log('=           Sonic Odyssey BOT          ='.cyan);
  console.log('=     Edited by UbuntuForNodes         ='.cyan);
  console.log('=    https://t.me/UbuntuForNodes       ='.cyan);
  console.log('========================================'.cyan);
  console.log();
}

module.exports = {
  displayHeader,
};
