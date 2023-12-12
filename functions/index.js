/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// The Cloud Functions for Firebase SDK to create Cloud Functions and triggers.
const {logger} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");

// The Firebase Admin SDK to access Firestore.
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp()

exports.addGift = onRequest({cors: true}, async (req, res) => {
  req.body.isClaimed = false;
  const writeResult = await getFirestore()
    .collection("gifts")
    .add(req.body);
  res.json({result: `Gift ${writeResult.id} added.`})
})

exports.getAllGifts = onRequest({cors: true},
  async (req, res) => {
    const readResult = await getFirestore()
      .collection("gifts")
      .get()

    const gifts = [];

    for (const doc of readResult.docs) {
      const gift = {
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        estimatedPrice: doc.data().estimatedPrice,
        imageURL: doc.data().imageURL,
        purchaseURL: doc.data().purchaseURL,
        isClaimed: doc.data().isClaimed,
      };
      gifts.push(gift);
    }

    res.status(200).json(gifts);
  })

exports.claimGift = onRequest({cors: true}, async (req, res) => {
  const {giftId, isClaimed} = req.query;

  await getFirestore()
    .collection("gifts")
    .doc(giftId)
    .update({isClaimed: isClaimed === 'true'});

  res.status(200).json();
})
