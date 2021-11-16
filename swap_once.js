const { chromium } = require('playwright');
const assert = require('assert');
require('dotenv').config();
const { postMessage } = require('./wxpush');
const fs = require('fs-extra');

const username = process.env.ALBERT_USERNAME;
const password = process.env.ALBERT_PASSWORD;
const toBeSwapped = process.env.TO_BE_SWAPPED;
const swapTo = process.env.SWAP_TO;

const swap = async () => {
	const date = new Date();
	console.log(date.toLocaleString());
	const browser = await chromium.launch({
		// headless: false,
	});
	// const context = await browser.newContext();
	const state_exists = await fs.pathExists('state.json');
	const context = await browser.newContext(state_exists ? { storageState: 'state.json' } : undefined);
	const page = await context.newPage();
	await page.goto('https://m.albert.nyu.edu/app/profile/login');
	await page.waitForLoadState('load');

	if (page.url() === 'https://m.albert.nyu.edu/app/profile/login') {
		console.log('Credentials expired, attempting login');
		await page.fill('[placeholder="Username"]', username);
		await page.fill('[placeholder="Password"]', password);
		await page.press('[placeholder="Password"]', 'Enter');
		// Login Success
		assert.equal(page.url(), 'https://m.albert.nyu.edu/app/dashboard');
		// Save storage state into the file.
		await context.storageState({ path: 'state.json' });
	} else {
		console.log('Using logged-in state');
	}

	console.log(`Attempting to swap ${toBeSwapped} with ${swapTo}`);

	await page.goto(
		'https://m.albert.nyu.edu/app/student/enrollmentswap/swapclassdetails/1224/UGRD/NYUNV'
	);
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
		console.log('Waitlist Exist');
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

(async () => {
	await swap();
})();
