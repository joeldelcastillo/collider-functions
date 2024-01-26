
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import { onCustomEventPublished } from "firebase-functions/v2/eventarc";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import Expo from "expo-server-sdk";


initializeApp();
const db = getFirestore();
const expo = new Expo();


export const createCustomAzureToken = onCall(async (request) => {
    const additionalClaims = {
        email: request.data.email,
        name: request.data.name,
    };
    logger.info("New Token Request: ", request.data);
    try {
        const token = await getAuth()
            .createCustomToken(request.data.uid, additionalClaims);
        logger.info("Token Created for", request.data.email, token);
        return {
            customToken: token,
            status: "success",
            message: "Token Created",
        };
    } catch (error) {
        // Handle error here
        logger.error("Error while creating token for: ",
            request.data.email, error);
        return {
            status: "error",
            error: error,
        };
    }
});


export const resizeImageHandler = onCustomEventPublished(
    "firebase.extensions.storage-resize-images.v1.onSuccess",

    (e) => {
        // Handle extension event here.
        // Update the user's image when the resized image is available.
        const fileBucket = e.data.bucket; // Storage bucket containing the file.
        const filePath = e.data.name; // File path in the bucket.
        const contentType = e.data.contentType; // File content type.
        // const fileName = filePath.split("/").pop();
        logger.info("Event Image Data: ", {
            fileBucket,
            filePath,
            contentType,
        });

        logger.info("Event Image Data: ", e.data);
    });


export const updateDocumentOnFirestoreChange = onDocumentUpdated("events/{documentId}", (event) => {
    const beforeData = event.data?.before?.data() ?? {};
    const afterData = event.data?.after?.data() ?? {};
    logger.info("Before Data: ", beforeData);
    logger.info("After Data: ", afterData);

    // We'll only update if the name has changed.
    // This is crucial to prevent infinite loops.
    if (beforeData.name == afterData.name) {
        return null;
    }
    // if (!valuesChanged(beforeData, afterData)) {
    //     console.log("No changes in relevant fields. Exiting function.");
    //     return null;
    // }


    return event.data?.after?.ref.update({
        updatedAt: Timestamp.now(),
    });
});

export const notificationSender = onDocumentCreated("users/{usersId}/notifications/{notificationsDocId}", async (event) => {
    // const message = event.data?.data() ?? {};
    const usersId = event.params?.usersId;

    // use the {usersId} to get the user's expoPushToken
    const userRef = db.collection("users").doc(usersId).collection("private").doc(usersId);
    const userDocSnapshot = await userRef.get();
    const expoPushToken = userDocSnapshot.data()?.pushToken;
    const message = event.data?.data() ?? {};

    if (expoPushToken) {
        logger.info("Sending Notification to: ", usersId, expoPushToken);
        return expo.sendPushNotificationsAsync([
            {
                to: expoPushToken,
                sound: "default",
                title: "Collider",
                subtitle: "Haz recibido una solicitud de amistad",
                body: message.message ?? "",
                badge: 1,
                data: {
                    withSome: "notification",
                },
                priority: "high",
            },
        ]);
    }
    logger.info("No Expo Push Token found for: ", usersId);
    return null;
});


// import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";

// admin.initializeApp();

// const firestore = admin.firestore();

// export const createNotificationsOnGroupUpdate = functions.firestore
//     .document("groups/{groupId}")
//     .onUpdate(async (change, context) => {
//         const beforeData = change.before.data() as GroupType;
//         const afterData = change.after.data() as GroupType;

//         // Check if the invited list has been updated
//         if (beforeData.invited !== afterData.invited) {
//             const newInvited = getNewInvitedMembers(beforeData.invited, afterData.invited);

//             // Create notifications for new invited members
//             await createNotifications(context.params.groupId, newInvited);
//         }
//     });

// // eslint-disable-next-line require-jsdoc
// async function createNotifications(groupId: string, invitedMembers: string[]) {
//     const notificationsCollection = firestore.collection("/users/notifications");

//     for (const userId of invitedMembers) {
//         // Check if a notification document already exists for the user
//         const existingNotification = await notificationsCollection
//             .doc(userId)
//             .collection("groupInvitations")
//             .doc(groupId)
//             .get();

//         if (!existingNotification.exists) {
//             // Create a new notification document for the user
//             await notificationsCollection
//                 .doc(userId)
//                 .collection("groupInvitations")
//                 .doc(groupId)
//                 .set({
//                     groupId,
//                     timestamp: admin.firestore.FieldValue.serverTimestamp(),
//                 });
//         }
//     }
// }

// // eslint-disable-next-line require-jsdoc
// function getNewInvitedMembers(beforeInvited: string[], afterInvited: string[]): string[] {
//     return afterInvited.filter((userId) => !beforeInvited.includes(userId));
// }


// export type GroupType = {
//     name: string | undefined;
//     emoji: string | undefined;
//     id: string | undefined;
//     privacy: "public" | "private" | "unlisted" | undefined;
//     image: string | undefined;
//     description: string | undefined;
//     organizers: string[];
//     members: string[];
//     invited: string[];
//     requests: string[];
//     blocked: string[];
//     topics: string[] | undefined;
//     createdAt: Date | undefined;
//     createdBy: string | undefined;
//     updatedAt: Date | undefined;
//     updatedBy: string | undefined;
//     likedBy: string[] | undefined;
//     likes: number | undefined;
//     comments: string[] | undefined;
//     reports: string[] | undefined;
//     events: string[];
//     numMembers: number | undefined;
// };
