import { r as transcribeDeepgramAudio } from "./audio-CZvngqbN.js";
//#region extensions/deepgram/media-understanding-provider.ts
const deepgramMediaUnderstandingProvider = {
	id: "deepgram",
	capabilities: ["audio"],
	transcribeAudio: transcribeDeepgramAudio
};
//#endregion
export { deepgramMediaUnderstandingProvider as t };
