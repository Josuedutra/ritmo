
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('🎥 Starting video recording...');

    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        recordVideo: {
            dir: 'public/videos/',
            size: { width: 1280, height: 800 }
        }
    });
    const page = await context.newPage();

    try {
        // 1. Login
        console.log('🔑 Logging in...');
        await page.goto('http://localhost:3000/login');
        await page.fill('input[type="email"]', 'admin@demo.ritmo.app');
        await page.fill('input[type="password"]', 'demo123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        // 2. Force Dark Mode & Setup
        await page.evaluate(() => {
            window.localStorage.setItem('theme', 'dark');
            document.documentElement.classList.add('dark');
        });
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 3. Demo Flow
        console.log('🎬 Action!');

        // Dashboard Overview
        await page.mouse.move(200, 300);
        await page.waitForTimeout(1000);
        await page.mouse.move(600, 300); // Hover stats
        await page.waitForTimeout(1000);

        // Go to Quotes
        console.log('➡️ Navigating to Quotes...');
        await page.click('a[href="/quotes"]');
        await page.waitForTimeout(2000);

        // Hover over some rows
        await page.mouse.move(400, 300); // First row
        await page.waitForTimeout(800);
        await page.mouse.move(400, 400); // Second row
        await page.waitForTimeout(800);

        // Click New Quote
        console.log('➡️ Clicking New Quote...');
        await page.click('a[href="/quotes/new"]');
        await page.waitForTimeout(2000);

        // Type something
        await page.fill('input[name="title"]', "Projecto Demo");
        await page.waitForTimeout(1000);

        // Back to Dashboard
        console.log('⬅️ Back to Dashboard...');
        await page.click('a[href="/dashboard"]');
        await page.waitForTimeout(2000);

        console.log('🎬 Cut!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await context.close(); // Saves the video
        await browser.close();

        // Find and Rename Video
        const videoDir = 'public/videos/';
        const files = fs.readdirSync(videoDir);
        const videoFile = files.find(f => f.endsWith('.webm'));

        if (videoFile) {
            const oldPath = path.join(videoDir, videoFile);
            const newPath = 'public/workflow_demo.webm';
            fs.renameSync(oldPath, newPath);
            console.log(`✅ Video saved to ${newPath}`);
            // Clean up dir
            fs.rmdirSync(videoDir);
        } else {
            console.error('❌ No video file found!');
        }
    }
}

main();
