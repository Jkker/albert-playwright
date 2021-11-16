const { chromium } = require('playwright');
const assert = require('assert');
require('dotenv').config();
const { postMessage } = require('./wxpush');

const username = process.env.ALBERT_USERNAME;
const password = process.env.ALBERT_PASSWORD;
const toBeSwapped = process.env.TO_BE_SWAPPED;
const swapTo = process.env.SWAP_TO;

(async () => {
	const browser = await chromium.launch({
		headless: false,
	});
	const context = await browser.newContext();
	// Open new page
	const page = await context.newPage();
	// Go to https://m.albert.nyu.edu/app/profile/login
	await page.goto('https://m.albert.nyu.edu/app/profile/login');
	// Fill [placeholder="Username"]
	await page.fill('[placeholder="Username"]', username);
	// Fill [placeholder="Password"]
	await page.fill('[placeholder="Password"]', password);
	// Press Enter
	await page.press('[placeholder="Password"]', 'Enter');

	//* Login Success
	assert.equal(page.url(), 'https://m.albert.nyu.edu/app/dashboard');

	console.log(`Attempting to swap ${toBeSwapped} with ${swapTo}`);

	await page.goto(
		'https://m.albert.nyu.edu/app/student/enrollmentswap/swapclassdetails/1224/UGRD/NYUNV'
	);
	// Check class to be swapped
	await page.click(`label[for="radio-${toBeSwapped}"]`);
	// Fill [placeholder="Class Nbr"]
	await page.fill('[placeholder="Class Nbr"]', swapTo);
	// Click text=Submit
	await Promise.all([
		page.waitForNavigation(),
		page.click('text=Submit', {
			delay: 78,
		}),
	]);

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
	await Promise.all([
		page.waitForNavigation(),
		page.click('input:has-text("Swap")', {
			delay: 62,
		}),
	]);

	//* Validate Result
	const success = await page.$(
		'div.section-content.visual-links:has-text("Success: This class has been replaced.")'
	);
	if (success) {
		const result = await page.innerText('section > div:has-text("Swap ")');
		console.log(`✅ Successful${result}`);
		await postMessage(`✅ Successful${result}`);
	} else {
		console.log(`Failed to swap ${toBeSwapped} with ${swapTo}`);
	}

	//* Confirm & Close browser
	await Promise.all([
		page.waitForNavigation(),
		page.click('text=Okay', {
			delay: 62,
		}),
	]);

	assert.equal(page.url(), 'https://m.albert.nyu.edu/app/student/enrollmentswap/classSwap');

	await context.close();
	await browser.close();
})();
