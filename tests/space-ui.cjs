/* shadcnspace interaction regression. Synthetic entries; disposable browser only. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/legacy.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':body);});});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Bangkok',reducedMotion:'no-preference'}),external=[];
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname!=='127.0.0.1'){external.push(route.request().url());return route.abort();}return route.continue();});
    await context.addInitScript(()=>{
      if(localStorage.getItem('space-test-seeded'))return;
      localStorage.setItem('space-test-seeded','yes');
      localStorage.setItem('mw-workspace',JSON.stringify({mode:'fresh'}));
      localStorage.setItem('mw-category-meta',JSON.stringify({Food:{type:'Expense',color:'#9476CF'},Salary:{type:'Income',color:'#329A7B'}}));
      localStorage.setItem('mw-cards',JSON.stringify([{id:'test-card',name:'Everyday Violet',last4:'4812',kind:'credit',color:'#8562CB',color2:'#272445',status:'Active',dueDay:25}]));
      localStorage.setItem('mw-plans',JSON.stringify([{id:'test-plan',name:'Studio laptop',amount:12000,months:12,rate:0.59,monthly:1070.8,status:'Ongoing',paidMonths:2,startMonth:'2026-08',card:'test-card'}]));
      const rows=Array.from({length:24},(_,index)=>({id:'tx-sample-'+index,date:'2026-10-'+String(index+1).padStart(2,'0'),income:0,expense:100+index,categories:{Food:100+index},category:'Food',card:'test-card',note:index===18?'Café <b>literal</b> lunch':'Everyday meal '+(index+1)}));
      rows.push({id:'tx-sample-salary',date:'2026-10-01',income:30000,expense:0,categories:{},category:'Salary',card:'',note:'Monthly salary'});
      localStorage.setItem('mw-tx',JSON.stringify(rows));localStorage.setItem('mw-budgets',JSON.stringify({'2026-10':10000}));
    });
    const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    const nav=async name=>{await page.locator(`.nav-item[data-view="${name}"]`).click();await page.waitForFunction(view=>document.querySelector('.nav-item.active')?.dataset.view===view,name);};
    const close=async()=>{await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.modal-backdrop').waitFor({state:'detached'});};
    const choose=async(selector,value)=>{const select=page.locator(selector),index=await select.evaluate((node,value)=>[...node.options].findIndex(option=>option.value===value),value);assert.ok(index>=0);await select.locator('..').getByRole('combobox').click();await page.getByRole('listbox').getByRole('option').nth(index).click();};
    const screenshot=async name=>{if(process.env.MW_SCREENSHOT_DIR){await page.evaluate(()=>Promise.all(document.getAnimations().filter(animation=>animation.playState==='running'&&animation.effect?.getTiming().iterations!==Infinity&&animation.effect?.target?.getClientRects().length).map(animation=>animation.finished.catch(()=>{}))));await page.screenshot({path:path.join(process.env.MW_SCREENSHOT_DIR,`moneywise-space-${name}.png`),fullPage:true});}};
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.locator('#space-splash').waitFor({state:'hidden'});
    assert.equal(await page.locator('.space-header').count(),1);assert.equal(await page.locator('link[rel="stylesheet"]').count(),1);
    assert.equal(await page.evaluate(()=>Finance.totals(txs()).expense),2676);
    assert.equal(await page.locator('.space-place-image').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.getByRole('button',{name:'Daily',exact:true}).click();await page.getByRole('img',{name:'Daily income and spending in Thai baht'}).waitFor();
    await page.locator('.space-chart-data summary').click();assert.equal(await page.locator('.space-chart-data tbody tr').count(),31);
    await page.getByRole('button',{name:'Monthly',exact:true}).click();await screenshot('populated-light');
    // One global-search invocation, escaped content, and a result opening the actual day.
    await page.keyboard.press('Control+k');await page.locator('#space-command-query').fill('Café');assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.locator('.space-command-result strong b').count(),0);
    await page.locator('#space-command-query').press('ArrowDown');await page.keyboard.press('Enter');await page.locator('#ledger-search').waitFor();assert.equal(await page.locator('#ledger-search').inputValue(),'2026-10-19');
    await page.getByRole('button',{name:'Details',exact:true}).click();await page.locator('.entry-item').click({button:'right'});await page.getByRole('menu').waitFor();
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('menu').count(),0);assert.equal(await page.getByRole('dialog').count(),1);
    await page.locator('.entry-item').click({button:'right'});await page.getByRole('menuitem',{name:'Edit transaction'}).click();await page.locator('#amount').fill('125');await page.locator('.save-modal').click();await page.locator('.modal-backdrop').waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>txs().find(row=>row.id==='tx-sample-18').expense),125);
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.locator('.space-pagination').waitFor();
    await page.getByRole('button',{name:'Page 2',exact:true}).click();await page.waitForFunction(()=>page===1);assert.equal(await page.getByRole('button',{name:'Page 2',exact:true}).getAttribute('aria-current'),'page');
    // 3D card has no inaccessible back-face controls in the tab order.
    await nav('cards');const card=page.locator('[data-space-card="test-card"]');
    assert.equal(await card.locator('.space-card-back').evaluate(el=>el.inert),true);await card.getByRole('button',{name:'Show recorded purchases'}).click();assert.ok((await card.locator('[data-card-purchase-value]').innerText()).includes('2,683.00'));
    await card.getByRole('button',{name:'Hide recorded purchases'}).click();assert.equal(await card.locator('[data-card-purchase-value]').innerText(),'••••••');
    await card.locator('[data-space-flip]').click();assert.equal(await card.locator('.space-card-front').evaluate(el=>el.inert),true);assert.equal(await card.locator('.space-card-back').evaluate(el=>el.inert),false);
    await card.getByRole('button',{name:'View activity',exact:false}).click();await page.locator('#ledger-search').waitFor();assert.equal(await page.evaluate(()=>txFilters.card),'test-card');
    await nav('installments');await page.getByRole('button',{name:'Pin Studio laptop',exact:true}).click();await page.getByRole('button',{name:'Unpin Studio laptop',exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>workspace.pinnedPlans),['test-plan']);
    // Topbar profile dropdown → local preferences; persist and back up without authentication.
    await page.getByRole('button',{name:'Workspace menu',exact:true}).click();await page.getByRole('menuitem',{name:'Workspace preferences',exact:true}).click();await page.locator('#space-profile-name').fill('My money studio');await choose('#space-density','compact');await choose('#space-motion','reduced');await page.locator('.save-modal').click();await page.locator('.modal-backdrop').waitFor({state:'detached'});
    await page.reload();await page.locator('#space-splash').waitFor({state:'hidden'});assert.equal(await page.locator('[data-space-name]').innerText(),'My money studio');assert.equal(await page.locator('body').getAttribute('data-motion'),'reduced');assert.equal(await page.locator('body').getAttribute('data-density'),'compact');
    const prefs=await page.evaluate(()=>{const payload=JSON.parse(JSON.parse(backupSource().split('\n')[1].slice('window.MONEYWISE_BACKUP_JSON = '.length,-1)));return validateBackup(payload)['mw-workspace'];});assert.equal(prefs.profile.name,'My money studio');assert.deepEqual(prefs.pinnedPlans,['test-plan']);
    await page.getByLabel('Dark mode').check();await screenshot('populated-dark');
    await page.getByRole('button',{name:'View payment reminders',exact:true}).click();await page.locator('.space-notification').first().waitFor();await close();
    await page.getByRole('button',{name:'Replay welcome',exact:true}).click();await page.locator('#space-splash').waitFor({state:'visible'});await page.locator('#space-splash').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>txs().length),25);
    for(const width of [390,768]){await page.setViewportSize({width,height:844});for(const view of ['overview','transactions','cards','installments','categories']){await nav(view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${view} overflows at ${width}px`);}if(width===390){await nav('overview');await screenshot('mobile');await page.getByRole('button',{name:'Data & settings',exact:true}).last().click();await page.getByRole('button',{name:'Save data',exact:true}).waitFor();await close();}}
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('PASS: startup splash, local-only assets, daily/monthly chart, global search, escaped text, context actions and Escape, numbered pages, card reveal/flip/accessibility/activity, pinned plans, profile menu/preferences/backup, reminders, replay, reduced motion and 390/768px layouts.');
    await context.close();
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
