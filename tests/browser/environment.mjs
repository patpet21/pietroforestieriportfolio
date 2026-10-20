// Font delivery is unrelated to gesture control. Keep browser assertions local
// and deterministic when a third-party stylesheet stalls document startup.
export async function mockRemoteFonts(page){
 await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
 await page.route('https://fonts.gstatic.com/**',route=>route.abort());
}
