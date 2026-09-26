// Emergency password reset - there is no "forgot password" flow inside the
// app itself (it's a single-user local system with no email to send a
// reset link to), so if the treasurer's login is ever lost, this is the
// only way back in. Run from the project folder:
//   npm run reset-password -- <username> <newPassword>
const bcrypt = require('bcryptjs');
const db = require('./db');

const [, , username, newPassword] = process.argv;

function usage() {
  console.log('Usage: npm run reset-password -- <username> <newPassword>');
  console.log('Example: npm run reset-password -- treasurer visiwani2026');
}

if (!username || !newPassword) {
  usage();
  process.exit(1);
}
if (newPassword.length < 6) {
  console.log('The new password must be at least 6 characters.');
  process.exit(1);
}

const user = db.state.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
if (!user) {
  console.log(`No user found with username "${username}".`);
  const existing = db.state.users.map((u) => u.username).join(', ');
  console.log(existing ? `Existing usernames: ${existing}` : 'There are no users yet - start the app once to create the default login.');
  process.exit(1);
}

user.passwordHash = bcrypt.hashSync(newPassword, 10);
db.save();
console.log(`Password for "${user.username}" has been reset. You can log in with it now.`);
