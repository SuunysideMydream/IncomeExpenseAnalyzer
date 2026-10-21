/* Full fresh-ledger lifecycle. Uses an isolated profile and a temporary server. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/legacy.html'));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':body);});});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Bangkok',reducedMotion:'reduce',acceptDownloads:true});
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());page.setDefaultTimeout(12000);
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.getByRole('heading',{name:'Monthly overview',exact:true}).waitFor();
    const initial=await page.evaluate(()=>({backup:backupSource(),count:txs().length}));assert.ok(initial.count>800);
    const choose=async(selector,value)=>{const select=page.locator(selector),index=await select.evaluate((node,value)=>[...node.options].findIndex(option=>option.value===value),value);assert.ok(index>=0,`Missing option ${value}`);await select.locator('..').getByRole('combobox').click();await page.getByRole('listbox').getByRole('option').nth(index).click();};
    const save=async()=>{await page.locator('.save-modal').click();await page.locator('.modal-backdrop').waitFor({state:'detached'});};
    const nav=async(name)=>{await page.locator('.nav-item').filter({hasText:new RegExp(`^\\s*[^a-zA-Z]*${name}$`)}).click();};
    const snapshot=()=>page.evaluate(()=>({mode:workspace.mode,records:txs().length,cards:cards().length,plans:plans().length,categories:categories().length,income:Finance.totals(txs()).income,expense:Finance.totals(txs()).expense,source:data.records.length}));
    const settle=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.evaluate(()=>Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{}))));};
    const screenshot=async(name)=>{if(process.env.MW_SCREENSHOT_DIR){await settle();await page.screenshot({path:path.join(process.env.MW_SCREENSHOT_DIR,`moneywise-real-${name}.png`),fullPage:true});}};
    // Cancelled and invalid confirmation never clear records.
    await page.getByRole('button',{name:'Clear data',exact:true}).click();await page.locator('#clear-confirmation').fill('no');await page.locator('.save-modal').click();assert.ok((await page.locator('.modal-error').innerText()).includes('CLEAR'));await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.locator('.modal-backdrop').waitFor({state:'detached'});assert.equal((await snapshot()).records,initial.count);
    await page.getByLabel('Dark mode').check();await page.evaluate(()=>localStorage.setItem('unrelated-preference','keep'));
    await page.getByRole('button',{name:'Clear data',exact:true}).click();await page.locator('#clear-confirmation').fill('CLEAR');await save();
    assert.deepEqual(await snapshot(),{mode:'fresh',records:0,cards:0,plans:0,categories:0,income:0,expense:0,source:0});
    await page.reload();await page.getByRole('heading',{name:'Monthly overview',exact:true}).waitFor();assert.equal((await snapshot()).source,0);assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-preference')),'keep');assert.equal(await page.evaluate(()=>document.body.classList.contains('dark')),true);
    assert.equal(await page.locator('.workbook-history').count(),0);await screenshot('empty');
    await page.getByRole('button',{name:'Use starter categories',exact:true}).click();
    assert.equal((await snapshot()).categories,8);
    // Set up both card types and a user-defined category through the actual forms.
    await nav('Cards');await page.getByRole('button',{name:'Add cash card',exact:false}).click();await page.getByLabel('Card name',{exact:true}).fill('Daily cash');await page.getByLabel('Last 4 digits',{exact:true}).fill('9876');await page.locator('#due').fill('31');await page.locator('#card-color-hex').fill('#345');await page.locator('#card-color-hex-end').fill('#F0A');await save();
    const cash=await page.evaluate(()=>localCards[0].id);
    await page.getByRole('button',{name:'Add credit card',exact:false}).click();await page.locator('#name').fill('Everyday Visa');await page.locator('#last4').fill('1234');await page.locator('#due').fill('15');await save();
    const credit=await page.evaluate(()=>localCards.find(card=>card.kind==='credit').id);
    assert.equal(await page.evaluate(id=>dueDateForMonth(cards().find(card=>card.id===id),'2027-02'),cash),'2027-02-28');
    await nav('Categories');await page.getByRole('button',{name:'New category',exact:false}).click();await page.locator('#name').fill('Subscriptions');await save();
    const record=async(type,amount,category,date,card='',note='')=>{
      await nav('Overview');await page.locator(`[data-personal="${type}"]`).first().click();await page.locator('#amount').fill(String(amount));await page.locator('#date').fill(date);await choose('#category',category);if(card)await choose('#card',card);await page.locator('#note').fill(note);await save();
    };
    await record('income',25000,'Salary','2026-10-01','','October salary');
    await record('expense',120.5,'Food','2026-10-19',cash,'Lunch');
    await record('expense',49.5,'Subscriptions','2026-10-18',credit,'Music subscription');
    await record('expense',250,'Home & bills','2026-10-18','','Electricity');
    assert.equal((await snapshot()).expense,420);assert.equal((await snapshot()).income,25000);
    // Category rename follows historical allocations, and duplicate names are rejected.
    await nav('Categories');await page.locator('[data-edit-category="Food"]').click();await page.locator('#name').fill('Meals');await save();assert.equal(await page.evaluate(()=>categories().includes('Food')),false);assert.equal(await page.evaluate(()=>txs().find(row=>row.note==='Lunch').categories.Meals),120.5);
    await page.locator('[data-edit-category="Meals"]').click();await page.locator('#name').fill('Salary');await page.locator('.save-modal').click();assert.ok((await page.locator('.modal-error').innerText()).includes('already exists'));await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.locator('.modal-backdrop').waitFor({state:'detached'});
    await nav('Overview');await page.getByRole('button',{name:'Set budget',exact:true}).click();await page.locator('#monthly-budget').fill('10000');await save();assert.equal(await page.evaluate(()=>monthlyBudgets['2026-10']),10000);await screenshot('overview-dark');
    await nav('Cards');await choose('[data-action="card-month"]','2026-10');
    assert.ok((await page.locator('.card-report').innerText()).includes('170.00'));
    await page.locator(`[data-space-card="${cash}"] [data-space-flip]`).click();
    await page.locator(`[data-space-card="${cash}"] [data-card-activity]`).click();await page.locator('#ledger-search').waitFor();assert.equal(await page.evaluate(()=>matchingTransactions().length),1);
    // Installment progress is explicit and does not double-count recorded spending.
    await nav('Installments');await page.getByRole('button',{name:'Add plan',exact:false}).click();await page.locator('#name').fill('Laptop');await page.locator('#plan-amount').fill('6000');await choose('#months','3');await choose('#rate','0.59');await choose('#plan-card',credit);await page.locator('#plan-start').fill('2026-10');assert.equal(await page.locator('#monthly').inputValue(),'2035.40');await save();
    for(let index=0;index<3;index++)await page.getByRole('button',{name:'Mark month paid',exact:true}).click();
    await page.waitForFunction(()=>plans()[0]?.status==='Completed');assert.equal((await snapshot()).expense,420);assert.equal(await page.evaluate(()=>plans()[0].paidMonths),3);
    await page.getByRole('button',{name:'Add plan',exact:false}).click();await page.locator('#name').fill('Phone');await page.locator('#plan-amount').fill('2400');await choose('#months','12');await choose('#rate','0');await page.locator('#plan-start').fill('2026-10');await save();await screenshot('plans');
    // Backup restores workspace mode, budget, aliases, plans, and both card colors.
    const backup=await page.evaluate(()=>backupSource()),expected=await snapshot();
    await page.getByRole('button',{name:'Clear data',exact:true}).click();await page.locator('#clear-confirmation').fill('CLEAR');await save();assert.equal((await snapshot()).records,0);
    const restore=async text=>{await page.locator('#backup-file').setInputFiles({name:'savedata.js',mimeType:'text/javascript',buffer:Buffer.from(text)});await page.waitForFunction(()=>!document.querySelector('#backup-file').value);};
    await restore(backup);assert.deepEqual(await snapshot(),expected);await page.reload();await page.getByRole('heading',{name:'Monthly overview',exact:true}).waitFor();assert.deepEqual(await snapshot(),expected);assert.equal(await page.evaluate(()=>monthlyBudgets['2026-10']),10000);assert.equal(await page.evaluate(()=>txs().find(row=>row.note==='Lunch').categories.Meals),120.5);assert.equal(await page.evaluate(id=>cards().find(card=>card.id===id).color2,cash),'#FF00AA');
    // A legacy backup without workspace keys still opens its workbook history.
    const legacy=initial.backup.split('\n'),payload=JSON.parse(JSON.parse(legacy[1].slice('window.MONEYWISE_BACKUP_JSON = '.length,-1)));
    for(const key of ['mw-workspace','mw-budgets','mw-category-aliases'])delete payload.data[key];payload.version=1;legacy[0]='/* Moneywise backup v1. Import through Moneywise; do not execute. */';legacy[1]=`window.MONEYWISE_BACKUP_JSON = ${JSON.stringify(JSON.stringify(payload))};`;
    await restore(legacy.join('\n'));assert.equal((await snapshot()).mode,'workbook');assert.equal((await snapshot()).records,initial.count);await restore(backup);assert.deepEqual(await snapshot(),expected);
    // A failed clear retains all state; unrelated origin storage is never erased.
    const failure=await page.evaluate(()=>{const before=JSON.stringify(localTx),stored=localStorage.getItem('mw-tx'),set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='mw-workspace')throw Error('Quota');return set.call(this,key,value);};let message;try{message=clearWorkspace({querySelector:()=>({value:'CLEAR'})});}finally{Storage.prototype.setItem=set;}return {failed:!!message,unchanged:JSON.stringify(localTx)===before&&localStorage.getItem('mw-tx')===stored};});assert.deepEqual(failure,{failed:true,unchanged:true});
    await page.getByLabel('Dark mode').uncheck();await screenshot('overview-light');
    await page.setViewportSize({width:390,height:844});
    for(const view of ['Overview','Transactions','Cards','Installments','Categories']){await nav(view);await settle();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${view} overflows on mobile`);}
    await screenshot('mobile-categories');
    assert.deepEqual(errors,[]);console.log('PASS: cancel/confirm clear, permanent fresh mode, unrelated storage retained, starter/custom/renamed categories, income and cash/card expenses, budget, live card report, due-day clamping, installment calculations/progress, fresh and legacy backup restore, failed-clear rollback, light/dark and all mobile pages.');
    await context.close();
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
