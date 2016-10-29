'use strict';
var request = require('request');

/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */


// --------------- Helpers that build all of the responses -----------------------

function _buildSpeechletResponse(title, output, cardContent, repromptText, shouldEndSession) {
    return {
        outputSpeech: output,
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${cardContent}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildSsmlOutput(ssml) {
    return {
        type: "SSML",
        ssml: ssml
    }
}

function buildPlainTextOutput(text) {
    return {
        type: "PlainText",
        text: text
    }
}

function buildSsmlSpeechletResponse(title, ssml, repromptText, shouldEndSession) {
    return _buildSpeechletResponse(title, buildSsmlOutput(ssml), ssml, repromptText, shouldEndSession);
}

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return _buildSpeechletResponse(title, buildPlainTextOutput(output), output, repromptText, shouldEndSession);
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    const sessionAttributes = {};

    const cardTitle = "Welcome";

    const speechOutput = "Welcome to Raleigh Code Camp schedule explorer. " +
        "Ask about a particular speaker or session topic. " +
        "For example: what is the next session about JavaScript?";

    const repromptText = "Please ask about a speaker or session topic.";

    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = "Session Ended";
    const speechOutput = "Peace out!";
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function answerScheduleQuestion(intent, session, callback) {
    const cardTitle = "Code Camp schedule question";
    const shouldEndSession = false;
    const orderSlot = intent.slots.order.value ? intent.slots.order.value : "";
    const speakerSlot = intent.slots.speaker.value ? intent.slots.speaker.value : "";
    const topicSlot = intent.slots.topic.value ? intent.slots.topic.value : "";

    var repromptText = "What else would you like to know about the code camp schedule?";
    var sessionAttributes = {};
    var speechOutput;

    request("http://alexacodecamp.jayhill.net/api/schedule?" +
        `order=${orderSlot}&speaker=${speakerSlot}&topic=${topicSlot}`,

        function(error, response, body) {
            if (!error && response.statusCode === 200) {
                speechOutput = buildSsmlOutput(`<speak><p>${body}</p><p>${repromptText}</p></speak>`);
            } else {
                speechOutput = buildPlainTextOutput(error);
            }

            callback(sessionAttributes,
                 _buildSpeechletResponse(cardTitle, speechOutput, body, repromptText, shouldEndSession));
        });
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === "ScheduleIntent") {
        answerScheduleQuestion(intent, session, callback);
    } else if (intentName === "AMAZON.HelpIntent") {
        getWelcomeResponse(callback);
    } else if (intentName === "AMAZON.StopIntent" ||
               intentName === "AMAZON.CancelIntent") {
        handleSessionEndRequest(callback);
    } else {
        throw new Error("Invalid intent");
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
