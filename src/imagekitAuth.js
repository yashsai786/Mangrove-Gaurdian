const functions = require("firebase-functions");
const ImageKit = require("imagekit");

const imagekit = new ImageKit({
  publicKey: "public_KoLQpUZM3TZfPrc1If4RUVRgHAw=", 
  privateKey: "private_GVqKpddh6IL6eBWJDCWB3TBWWpg=", 
  urlEndpoint: "https://ik.imagekit.io/6jmupcf63/"
});

// Cloud function to generate ImageKit authentication parameters
exports.getImageKitAuth = functions.https.onRequest((req, res) => {
  const authParams = imagekit.getAuthenticationParameters();
  res.json(authParams);
});
