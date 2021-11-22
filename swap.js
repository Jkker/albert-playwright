require('dotenv').config();
const { chromium } = require('playwright');
const { postMessage } = require('./wxpush');
const { isFileStale } = require('./utils');
const cron = require('node-cron');
const fs = require('fs-extra');
const yargs = require('yargs');

const STATE_FILE_NAME = process.env.STATE_FILE_NAME ?? 'state.json';
const ALBERT_USERNAME = process.env.ALBERT_USERNAME;
const ALBERT_PASSWORD = process.env.ALBERT_PASSWORD;
const LOGIN_URL = process.env.LOGIN_URL ?? 'https://m.albert.nyu.edu/app/profile/login';
const SWAP_CLASS_URL =
	process.env.SWAP_CLASS_URL ??
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

const launch = async () => {
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
		.option('cron', {
			alias: 'c',
			description: 'Cron Schedule',
			type: 'string',
			default: process.env.CRON,
		})
		.help()
		.alias('help', 'h').argv;

	const schedule = argv.cron || `*/${argv.frequency} * * * *`;
	const browser = await chromium.launch({
		headless: !argv.verbose,
	});

	const context = await newContext(browser, STATE_FILE_NAME);

	const page = await context.newPage();

	const run = async () => await swap(context, page, { verbose: argv.verbose });
	if (argv.once) await run();
	else {
		const sc = schedule.split(' ');
		const num = sc[0].split('/')[1];
		switch (sc.length) {
			case 4:
				console.log(`Running task every ${num} hour${num == 1 ? '' : 's'}`);
				break;
			case 5:
				console.log(`Running task every ${num} minute${num == 1 ? '' : 's'}`);
				break;
			case 6:
				console.log(`Running task every ${num} second${num == 1 ? '' : 's'}`);
				break;
			default:
				console.log(`Running task every ${num} minute${num == 1 ? '' : 's'}`);
		}
		await run();

		console.log('🚀 ~ file: swap.js ~ line 111 ~ launch ~ schedule', schedule);
		const task = cron.schedule(schedule, run);
	}
	const closeBrowser = async () => {
		console.log('Program Exiting. Closing browser.');
		process.off('exit', closeBrowser);
		process.off('SIGTERM', closeBrowser);
		process.off('uncaughtException', closeBrowser);
		await context.close();
		await browser.close();
		task?.destroy();
		process.exit();
	};
	process.on('exit', closeBrowser);
	process.on('SIGTERM', closeBrowser);
	process.on('uncaughtException', closeBrowser);
};

const login = async (page, context, username, password, verbose) => {
	if ((await page.url()) !== LOGIN_URL) await page.goto(LOGIN_URL);
	console.log('Logging in...');
	await page.fill('[placeholder="Username"]', username);
	await page.fill('[placeholder="Password"]', password);
	await page.press('[placeholder="Password"]', 'Enter');
	await page.waitForLoadState('domcontentloaded');
	await context.storageState({ path: STATE_FILE_NAME });
	console.log('Login Success! Storage state saved to', STATE_FILE_NAME);
};

const swap = async (
	context,
	page,
	{ toBeSwapped = process.env.TO_BE_SWAPPED, swapTo = process.env.SWAP_TO, verbose = false }
) => {
	await page.goto(SWAP_CLASS_URL);
	// Not logged in
	if ((await page.url()) !== SWAP_CLASS_URL) {
		console.log('Credentials expired');
		await login(page, context, ALBERT_USERNAME, ALBERT_PASSWORD, verbose);
		await page.goto(SWAP_CLASS_URL);
	}

	// Check class to be swapped
	await page.click(`label[for="radio-${toBeSwapped}"]`);
	await page.fill('[placeholder="Class Nbr"]', swapTo);
	await page.click('text=Submit');
	await page.waitForLoadState('domcontentloaded');

	//* Waitlist Operations
	const wl = await page.$('label[for="wait_list_ok"]');
	if (wl) {
		if (verbose) console.log('Waitlist Exist');
		// Click button:has-text("No")
		await page.click('button:has-text("No")');
		// Click a:has-text("Yes")
		await page.click('a:has-text("Yes")');
		// Click text=Save
		await page.click('text=Save');
		await page.waitForLoadState('load');
	}

	//* Confirm Swap
	await page.click('input:has-text("Swap")');
	await page.waitForLoadState('domcontentloaded');

	//* Validate Result
	const success = await page.$(
		'div.section-content.visual-links:has-text("Success: This class has been replaced.")'
	);

	if (success) {
		const result = await page.innerText('section > div:has-text("Swap ")');
		console.log(`✅ Succeed to${result} ✅`);
		await postMessage(`✅ Succeed to${result} ✅`);
	} else {
		const result = await page.innerText('section > div:has-text("swap")');
		const error = await page.innerText(
			'div.section-content.visual-links > .section-body:has-text("Error:")'
		);
		console.log(`🔃 Failed to${result} 🔃${verbose ? '\n   ' + error : ''} `);
	}
};

launch();
