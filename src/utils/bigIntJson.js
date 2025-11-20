// src/utils/bigIntJson.js

export const enableBigIntJSON = () => {
  // Monkey-patching BigInt agar bisa di-stringify
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
};