
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import { onCustomEventPublished } from "firebase-functions/v2/eventarc";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
// eslint-disable-next-line camelcase, import/default
import { jwtDecode } from "jwt-decode";
import Expo from "expo-server-sdk";


initializeApp();
const db = getFirestore();
const expo = new Expo();

export const createCustomAzureToken = onCall(async (request) => {
    const decodedToken = jwtDecode(request.data.token) as Token;
    const additionalClaims = {
        tokenType: "azure",
        token: request.data.token,
        email: decodedToken.upn,
        name: decodedToken.name,
    };
    logger.info("New Token Request: ", request.data);

    // Check here if token is legitimate
    try {
        if (!decodedToken.oid) return;
        const token = await getAuth().createCustomToken(decodedToken.oid, additionalClaims);
        logger.info("Token Created for", decodedToken.upn);
        return {
            customToken: token,
            status: "success",
            message: "Token Created",
        };
    } catch (error) {
        // Handle error here
        logger.error("Error while creating token for: ", decodedToken.upn, error);
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

export interface Token {
    // issuer
    iss: string | undefined;
    // issued at (seconds since Unix epoch)
    iat: number | undefined;
    // not valid before (seconds since Unix epoch)
    nbf: number | undefined;
    // expiration time (seconds since Unix epoch)
    exp: number | undefined;
    // Collider
    app_displayname: string | undefined;
    // Collider id
    appid: string | undefined;
    // Del Castillo Baquero
    family_name: string | undefined;
    // Joel
    given_name: string | undefined;
    // IP Address
    ipaddr: string | undefined;
    // Joel Del Castillo Baquero
    name: string | undefined;
    // 7777e6ef-be73-4f48-b860-3508a0e647c6
    oid: string | undefined;

    tenant_region_scope: string | undefined;

    // jdelcastillo@estud.usfq.edu.ec
    unique_name: string | undefined;
    // jdelcastillo@estud.usfq.edu.ec
    upn: string | undefined;
}


// export const createNotificationsOnGroupUpdate = onDocumentUpdated("groups/{groupId}", async (event) => {
//     const beforeData = event.data?.before?.data() ?? {};
//     const afterData = event.data?.after?.data() ?? {};

//     // Check if the invited list has been updated
//     if (beforeData.invited !== afterData.invited) {
//         const newInvited = getNewInvitedMembers(beforeData.invited, afterData.invited);

//         // Create notifications for the group organizers
//         await createNotification(event.params.groupId, newInvited, "newMember");
//     }
// });

// export const createNotificationsOnGroupNewEvent = onDocumentUpdated("groups/{groupId}", async (event) => {
//     const beforeData = event.data?.before?.data() ?? {};
//     const afterData = event.data?.after?.data() ?? {};

//     // Check if the invited list has been updated
//     if (beforeData.events !== afterData.events) {
//         const newEventId = getNewEvent(beforeData.events as string[], afterData.events as string[]);
//         afterData.invited.forEach(async (userId: string) => {
//             // Create notifications for the group organizers
//             await createEventNotification(userId, event.params.groupId, newEventId);
//         });
//     }
// });

// // eslint-disable-next-line require-jsdoc
// function getNewEvent(beforeInvited: string[], afterInvited: string[]): string[] {
//     return afterInvited.filter((userId) => !beforeInvited.includes(userId));
// }


// // eslint-disable-next-line require-jsdoc
// async function createEventNotification(userId: string, groupId: string, eventId: string) {
//     const notificationsCollectionRef = db.collection("users").doc(userId).collection("notifications");
//     notificationsCollectionRef.add({
//         createdAt: Timestamp.now(),
//         updatedAt: Timestamp.now(),
//         updatedBy: "server",
//         uid: "",
//         type: "newEvent5",
//         status: "unread",
//         event: eventId,
//         group: groupId,
//         message: "Tu Grupo ha creado un nuevo Evento",
//         opened: false,
//     });
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
