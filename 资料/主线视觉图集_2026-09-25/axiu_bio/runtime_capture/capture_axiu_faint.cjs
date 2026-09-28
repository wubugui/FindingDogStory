const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/weiruanrinima/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out = __dirname;
const evidence = { url: '', events: [], screenshots: [], errors: [] };
const note = async (page, label) => {
  const state = await page.evaluate(() => ({
    scene: window.__game?.sceneManager?.currentSceneData?.id,
    dialogue: window.__game?.graphDialogueManager?.getDebugInteractionState?.(),
    minigame: window.__game?.waterMinigameManager?.getDebugVisualState?.(),
    gameState: window.__game?.stateController?.currentState,
  }));
  evidence.events.push({ label, state });
  console.log(label, JSON.stringify(state));
  return state;
};
const shot = async (page, filename) => {
  const file = path.join(out, filename);
  await page.screenshot({ path: file });
  evidence.screenshots.push(filename);
  console.log('SHOT', file);
};

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--window-size=1920,1080', '--force-device-scale-factor=1'],
  });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    screen: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') evidence.errors.push(`console:${msg.text()}`);
  });
  page.on('pageerror', err => evidence.errors.push(`pageerror:${err.message}`));
  try {
    evidence.url = 'http://127.0.0.1:5173/?mode=dev&ndbg=0&visualCapture=1&devScene=码头白天';
    await page.goto(evidence.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !!window.__game?.graphDialogueManager?.startDialogueGraph && window.__game?.sceneManager?.currentSceneData?.id === '码头白天', null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    const pin = page.locator('.debug-dock__pin-btn');
    if (await pin.count()) await pin.first().click().catch(() => {});
    await note(page, 'dock_loaded');

    await page.evaluate(() => window.__game.graphDialogueManager.startDialogueGraph({
      graphId: '线外_寻狗_码头选择', npcName: '旁白',
    }));
    await note(page, 'graph_started');
    await page.evaluate(() => window.__game.graphDialogueManager.advance());
    await note(page, 'choice_prompt');
    await page.evaluate(() => window.__game.graphDialogueManager.advance());
    await note(page, 'choice_options');
    await page.evaluate(() => {
      window.__axiuChoiceSettled = false;
      window.__axiuChoiceError = null;
      void window.__game.graphDialogueManager.chooseOption(0)
        .then(() => { window.__axiuChoiceSettled = true; })
        .catch(e => { window.__axiuChoiceError = String(e); });
    });
    await page.waitForFunction(() => window.__game?.waterMinigameManager?.getDebugVisualState?.().active === true, null, { timeout: 25000 });
    await note(page, 'minigame_active');
    await shot(page, '码头跳水_a1_小游戏仍在画面_复核_1024x768.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(350);
    await note(page, 'after_keyboard_escape');
    if (await page.evaluate(() => window.__game.waterMinigameManager.isActive)) {
      // 运行画面底部原生「Esc 退出」键帽也可点击；只触发 UI，不绕过游戏状态机。
      await page.mouse.click(510, 722);
      await page.waitForTimeout(350);
      await note(page, 'after_ui_exit_click');
    }
    await page.waitForFunction(() => window.__game?.waterMinigameManager?.getDebugVisualState?.().active === false, null, { timeout: 15000 });
    await page.waitForFunction(() => window.__game?.graphDialogueManager?.getDebugInteractionState?.().currentNodeId === 'a_3', null, { timeout: 15000 });
    await page.waitForTimeout(5500);
    await note(page, 'minigame_exited_a3_line');
    await shot(page, '码头跳水_a3_小游戏退出后旁白_复核_1024x768.png');

    await page.evaluate(() => {
      window.__axiuAdvanceSettled = false;
      window.__axiuAdvanceError = null;
      void window.__game.graphDialogueManager.advance()
        .then(() => { window.__axiuAdvanceSettled = true; })
        .catch(e => { window.__axiuAdvanceError = String(e); });
    });
    await page.waitForTimeout(300);
    await note(page, 'a4_cue_300ms');
    await shot(page, '码头跳水_a4_axiu_faint_原生播放_无通知_1024x768.png');
    await page.waitForTimeout(1450);
    await note(page, 'a4_cue_end');
    await shot(page, '码头跳水_a5_抓痕叠层_复核_1024x768.png');
    evidence.choiceSettled = await page.evaluate(() => window.__axiuChoiceSettled);
    evidence.advanceSettled = await page.evaluate(() => window.__axiuAdvanceSettled);
    evidence.advanceError = await page.evaluate(() => window.__axiuAdvanceError);
  } catch (e) {
    evidence.errors.push(String(e.stack || e));
    console.error(e);
    await shot(page, '码头跳水_失败状态_1024x768.png').catch(() => {});
  } finally {
    fs.writeFileSync(path.join(out, '码头跳水_axiu_faint_无通知复核记录.json'), JSON.stringify(evidence, null, 2), 'utf8');
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
