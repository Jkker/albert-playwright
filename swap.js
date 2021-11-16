require('dotenv').config();
const { chromium } = require('playwright');
const { postMessage } = require('./wxpush');
const { isFileStale } = require('./utils');
const assert = require('assert');
const cron = require('node-cron');
const fs = require('fs-extra');
const yargs = require('yargs');

const ALBERT_USERNAME = process.env.ALBERT_USERNAME;
const ALBERT_PASSWORD = process.env.ALBERT_PASSWORD;
const STATE_FILE_NAME = process.env.STATE_FILE_NAME ?? 'state.json';
const LOGIN_URL = 'https://m.albert.nyu.edu/app/profile/login';
const DASH_BOARD_URL = 'https://m.albert.nyu.edu/app/dashboard';
const SWAP_CLASS_URL =
	'https://m.albert.nyu.edu/app/student/enrollmentswap/swapclassdetails/1224/UGRD/NYUNV';

const newContext = async (
	browser,
	stateFileName = process.env.STATE_FILE_NAME ?? 'state.json',
	maxAge = '3h',
	options = {}
) => {
	// State file DNE
	if (!(await fs.pathExists(stateFileName))) {
		console.log('State file not found. Creating new context');
		return await browser.newContext(options);
	}
	// State file is stale
	if (await isFileStale(stateFileName, maxAge)) {
		console.log('State file is stale. Creating new context');
		return await browser.newContext(options);
	}
	return await browser.newContext({ ...options, storageState: stateFileName });
};

const swap = async ({ headless = true, verbose = false, ...options }) => {
	const toBeSwapped = options.toBeSwapped ?? process.env.TO_BE_SWAPPED;
	const swapTo = options.swapTo ?? process.env.SWAP_TO;

	const browser = await chromium.launch({
		headless,
	});

	const context = await newContext(browser, STATE_FILE_NAME);

	const page = await context.newPage();

	await page.goto(LOGIN_URL);
	await page.waitForLoadState('load');

	if (page.url() === LOGIN_URL) {
		console.log('Credentials expired, attempting login');
		await page.fill('[placeholder="Username"]', ALBERT_USERNAME);
		await page.fill('[placeholder="Password"]', ALBERT_PASSWORD);
		await page.press('[placeholder="Password"]', 'Enter');
		// Login Success
		assert.equal(page.url(), DASH_BOARD_URL);
		// Save storage state into the file.
		await context.storageState({ path: STATE_FILE_NAME });
	}

	await page.goto(SWAP_CLASS_URL);
	// Check class to be swapped
	await page.click(`label[for="radio-${toBeSwapped}"]`);
	// Fill [placeholder="Class Nbr"]
	await page.fill('[placeholder="Class Nbr"]', swapTo);

	await page.click('text=Submit', {
		delay: 78,
	});
	await page.waitForLoadState('networkidle');

	// await page.pause();

	//* Waitlist Operations
	const wl = await page.$('label[for="wait_list_ok"]');
	if (wl) {
		// console.log('Waitlist Exist');
		// Click button:has-text("No")
		await page.click('button:has-text("No")');
		// Click a:has-text("Yes")
		await page.click('a:has-text("Yes")');
		// Click text=Save
		await page.click('text=Save');
	}

	//* Confirm Swap
	await page.click('input:has-text("Swap")', {
		delay: 62,
	});
	await page.waitForLoadState('load');

	//* Validate Result
	const success = await page.$(
		'div.section-content.visual-links:has-text("Success: This class has been replaced.")'
	);
	if (success) {
		const result = await page.innerText('section > div:has-text("Swap ")');
		console.log(`✅ Successful${result}`);
		await postMessage(`✅ Successful${result}`);
	} else {
		const result = await page.innerText('section > div:has-text("swap")');
		console.log(`Failed${result}`);
	}

	//* Confirm & Close browser
	await page.click('text=Okay', {
		delay: 62,
	});
	await page.waitForLoadState('load');

	assert.equal(page.url(), 'https://m.albert.nyu.edu/app/student/enrollmentswap/classSwap');

	await context.close();
	await browser.close();
};

async function main() {
	const argv = yargs
		.option('once', {
			alias: 'o',
			description: 'Run once',
			type: 'boolean',
			default: false,
		})
		.option('verbose', {
			alias: 'v',
			description: 'Run browser non-headless mode',
			type: 'boolean',
			default: false,
		})
		.option('frequency', {
			alias: 'f',
			description: 'Run every x minutes',
			type: 'number',
			default: process.env.FREQUENCY,
		})
		.help()
		.alias('help', 'h').argv;

	const options = {
		headless: !argv.verbose,
		verbose: argv.verbose,
	};
	if (argv.once) await swap(options);
	else {
		const frequency = argv.frequency ?? 0.5;
		console.log(`Running task every ${frequency} minutes`);
		cron.schedule(`*/${frequency} * * * *`, async () => await swap(options));
	}
}

main();
