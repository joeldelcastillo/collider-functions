
import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
// import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";

initializeApp();

// export const createCustomAzureToken = onCall((request) => {
//     const additionalClaims = {
//         email: request.data.email,
//         name: request.data.name,
//     };

//     logger.info("New Token Request: ", request.data);

//     return {
//         customToken: "123456",
//         status: "success",
//         message: "Token Created",
//     };

//     getAuth().createCustomToken(request.data.uid, additionalClaims)
//         .then((token) => {
//             logger.info("Token Created for", request.data.email, token);
//             return {
//                 customToken: "12asd3456",
//                 status: "success",
//                 message: "Token Created",
//             };
//         });
// });

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
