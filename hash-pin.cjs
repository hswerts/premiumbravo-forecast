// hash-pin.cjs
const bcrypt = require('bcryptjs');

const pin = process.argv[2] || '123456'; // passe o PIN como argumento
bcrypt.hash(pin, 10).then((hash) => {
  console.log('Hash gerado:', hash);
  process.exit(0);
});
