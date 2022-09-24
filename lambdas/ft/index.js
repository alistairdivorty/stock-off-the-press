"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const isLambdaRuntimeEnv = process.env.AWS_EXECUTION_ENV === 'AWS_Lambda_Image';
const tmpDir = '/tmp';
const userDataDir = tmpDir + '/chrome-user-data';
let browser;
const browserPromise = playwright_1.chromium.launchPersistentContext(userDataDir, {
    headless: isLambdaRuntimeEnv,
    args: [
        '--single-process',
        '--no-zygote',
        '--no-sandbox',
        '--disable-dev-shm-usage'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
});
/**
 * Lambda function handler
 * @param {Event} event - data from invoker
 */
exports.handler = async (event) => {
    browser = await browserPromise;
    const page = await browser.newPage();
    let cookies;
    try {
        await page.goto(event.url);
        await page.locator('#enter-email').fill(event.email);
        await page.locator('#enter-email-next').click();
        await page.locator('#enter-password').fill(event.password);
        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.locator('#sign-in-button').click()
        ]);
        cookies = await page.context().cookies();
    }
    catch (error) {
        console.log(error);
        throw error;
    }
    finally {
        await page.close();
    }
    return cookies;
};
