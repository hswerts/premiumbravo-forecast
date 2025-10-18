// hash-pin.js
import bcrypt from "bcryptjs";

const pin = "123456"; // defina o PIN que deseja
const rounds = 10;

bcrypt.hash(pin, rounds).then((hash) => {
  console.log("Hash gerado:", hash);
});
