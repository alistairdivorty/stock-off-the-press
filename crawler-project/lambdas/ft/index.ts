import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
const isLambdaRuntimeEnv = process.env.AWS_EXECUTION_ENV === 'AWS_Lambda_Image';
const tmpDir = '/tmp';
const userDataDir = path.join(tmpDir, 'chrome-user-data');

interface Event {
    email: string;
    password: string;
}

/**
 * Lambda function handler
 * @param {Event} event - data from invoker
 */
exports.handler = async (event: Event) => {
    const browser: BrowserContext = await chromium.launchPersistentContext(
        userDataDir,
        {
            headless: isLambdaRuntimeEnv,
            args: [
                '--single-process',
                '--no-zygote',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ],
            userAgent:
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
            ignoreDefaultArgs: ['--enable-automation']
        }
    );

    const page: Page = await browser.newPage();
    let cookies: object;

    try {
        await page.goto('https://accounts.ft.com/login');

        await page.locator('#enter-email').fill(event.email);
        await page.locator('#enter-email-next').click();
        await page.locator('#enter-password').fill(event.password);

        await Promise.all([
            page.waitForLoadState('networkidle'),
            page.locator('#sign-in-button').click()
        ]);

        await page.waitForURL('https://www.ft.com/', { timeout: 3000 });

        cookies = await page.context().cookies();
    } catch (error) {
        console.log(error);
        throw Error('CAPTCHA encountered.');
    } finally {
        await page.close();
        await browser.close();
    }

    return cookies;
};
