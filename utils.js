const fs = require('fs-extra');
const ms = require('ms');

const isFileStale = async (filePath, maxAge) => {
	try {
		const fileStats = await fs.stat(filePath);
		const fileAgeMs = Date.now() - fileStats.mtimeMs;
    staleTimeMs = ms(maxAge);
    // console.log('🚀 ~ file: utils.js ~ line 7 ~ isFileStale ~ fileAgeMs', fileAgeMs);
    // console.log("🚀 ~ file: utils.js ~ line 10 ~ isFileStale ~ staleTimeMs", staleTimeMs)
		if (fileAgeMs > staleTimeMs) {
			return true;
		}
	} catch (err) {
		return true;
	}
	return false;
};

module.exports = { isFileStale };

// (async () => {
// 	// const x = await isFileStale('state.json', 1000);
// 	const x = await isFileStale('state.json', '1h');
//   console.log(x);
// })();