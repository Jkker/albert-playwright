require('dotenv').config();
const axios = require('axios');

const WXPUSH_URL = process.env.WXPUSH_URL;
const WXPUSH_UID = process.env.WXPUSH_UID;
const WXPUSH_APPTOKEN = process.env.WXPUSH_APPTOKEN;

const postMessage = async (content, cb) => {
	try {
		const data = {
			appToken: WXPUSH_APPTOKEN,
			content,
			contentType: 1,
			uids: [WXPUSH_UID],
		};
		const res = await axios.post(WXPUSH_URL, data);
		if (cb) return cb(res);
		return res;
	} catch (err) {
		console.log('🚀 ~ file: wxpush.js ~ line 20 ~ postMessage ~ err', err);
		if (cb) return cb(err);
		return err;
	}
};

// (async () => {
// 	await postMessage('hello world');
// })();

module.exports = { postMessage };
