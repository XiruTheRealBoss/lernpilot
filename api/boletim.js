import { sendDisabled } from './_lyceum.js';
/** @param {import('node:http').IncomingMessage} _req @param {import('node:http').ServerResponse} res */
export default function handler(_req, res) { sendDisabled(res); }
