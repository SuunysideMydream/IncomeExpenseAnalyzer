/* Personal workspace state and everyday workflows. Workbook data stays optional. */
let workbookSnapshot=null,workspace={mode:'workbook'},monthlyBudgets={},categoryAliases={},workbookHistoryOpen=false;
const WORKSPACE_DEFAULTS={'mw-workspace':{mode:'workbook'},'mw-budgets':{},'mw-category-aliases':{}};
function emptyWorkbook(){return {source:'Personal ledger',categories:[],records:[],months:[],cardPayments:[],installments:[],cardCycles:[]};}
function initializeWorkspace(snapshot){workbookSnapshot=snapshot;workspace=read('mw-workspace',{mode:'workbook'});monthlyBudgets=read('mw-budgets',{});categoryAliases=read('mw-category-aliases',{});selectWorkspaceData();}
function selectWorkspaceData(){data=workspace.mode==='fresh'?emptyWorkbook():workbookSnapshot;const note=document.querySelector('.source-note');if(note)note.innerHTML=workspace.mode==='fresh'?'Personal workspace<br><b>Fresh ledger · saved on this browser</b>':'Workbook history + your entries<br><b>My Income Expense.xlsx</b>';}
function backupDefault(key){if(key in WORKSPACE_DEFAULTS)return structuredClone(WORKSPACE_DEFAULTS[key]);return key==='mw-theme'?'light':key.includes('meta')||key.includes('overrides')?{}:[];}
function commitWorkspace(values){
  const previous=Object.fromEntries(Object.keys(values).map(key=>[key,localStorage.getItem(key)]));
  try{Object.entries(values).forEach(([key,value])=>write(key,value));}
  catch(error){Object.entries(previous).forEach(([key,value])=>{try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}catch{}});throw Error('Could not save changes in this browser. Your previous data was retained.');}
}
function validateWorkspaceBackup(values){
  for(const [key,fallback]of Object.entries(WORKSPACE_DEFAULTS))values[key]??=structuredClone(fallback);
  if(!['fresh','workbook'].includes(values['mw-workspace']?.mode))throw Error('The backup workspace mode is invalid.');
  const preferences=values['mw-workspace'];
  if(preferences.profile!==undefined&&(!preferences.profile||typeof preferences.profile.name!=='string'||preferences.profile.name.length>50))throw Error('Invalid workspace name.');
  if(preferences.density!==undefined&&!['comfortable','compact'].includes(preferences.density))throw Error('Invalid reading comfort.');
  if(preferences.motion!==undefined&&!['full','reduced'].includes(preferences.motion))throw Error('Invalid motion preference.');
  if(preferences.pinnedPlans!==undefined&&(!Array.isArray(preferences.pinnedPlans)||preferences.pinnedPlans.some(id=>typeof id!=='string')))throw Error('Invalid pinned plans.');
  for(const key of ['mw-budgets','mw-category-aliases'])if(!values[key]||typeof values[key]!=='object'||Array.isArray(values[key]))throw Error('Invalid workspace preferences.');
  for(const [month,value]of Object.entries(values['mw-budgets']))if(!/^\d{4}-\d{2}$/.test(month)||!Number.isFinite(value)||value<0||value>1e12)throw Error('Invalid monthly budget.');
  for(const value of Object.values(values['mw-category-aliases']))if(typeof value!=='string'||!value.trim())throw Error('Invalid category rename history.');
}
function restoreWorkspaceState(values){workspace=values['mw-workspace'];monthlyBudgets=values['mw-budgets'];categoryAliases=values['mw-category-aliases'];selectWorkspaceData();resetViewSelections();}
function resetViewSelections(){txMonth=Finance.localDate().slice(0,7);cardMonth=txMonth;cardInsightMonth=paymentMonths().includes(txMonth)?txMonth:paymentMonths().at(-1);page=0;txFilters={query:'',type:'',category:'',card:''};cardCompareSelection=null;cardPickerOpen=false;workbookHistoryOpen=false;undoTransaction=null;}
function clearWorkspace(root){
  if(root.querySelector('#clear-confirmation').value.trim()!=='CLEAR')return 'Type CLEAR to confirm the fresh start.';
  try{
    const values=Object.fromEntries(BACKUP_KEYS.map(key=>[key,backupDefault(key)]));
    values['mw-theme']=read('mw-theme','light');values['mw-workspace']={mode:'fresh',startedAt:new Date().toISOString()};
    commitWorkspace(values);
    localTx=[];localCards=[];localPlans=[];catMeta={};planOverrides={};cardOverrides={};txOverrides={};
    restoreWorkspaceState(values);active='overview';document.querySelector('#ledger-notice')?.remove();render();notifyLedger('Fresh ledger ready. Add your first category, card, or transaction.');return '';
  }catch(error){return error.message;}
}
function showClearWorkspace(){
  modal('Clear all data & start fresh','Start a personal ledger from today.',`<div class="reset-summary"><p>This clears all transactions, credit and cash cards, installment plans, categories, budgets, and workbook edits saved for this site in this browser.</p><p>The old workbook history will stay excluded when you reopen the app. Your source Excel file is unchanged. Download a backup first if you want to restore the current ledger later.</p><button class="secondary" id="reset-backup" type="button">Download backup first</button></div><div class="field"><label for="clear-confirmation">Type CLEAR to confirm</label><input id="clear-confirmation" autocomplete="off" spellcheck="false" placeholder="CLEAR"></div>`,clearWorkspace);
  const root=document.querySelector('.modal-backdrop'),save=root.querySelector('.save-modal');save.textContent='Clear all data';save.classList.add('danger-button');
  root.querySelector('#reset-backup').onclick=()=>saveBackup().catch(error=>{root.querySelector('.modal-error').textContent=error.message;});
}
function resolvedCategory(name){let value=name;const visited=new Set();while(categoryAliases[value]&&!visited.has(value)){visited.add(value);value=categoryAliases[value];}return value;}
function personalTransactions(){return Finance.records(data.records,localTx,txOverrides).map(row=>{
  const allocations=Object.create(null);Object.entries(row.categories||{}).forEach(([name,amount])=>{const resolved=resolvedCategory(name);allocations[resolved]=(allocations[resolved]||0)+amount;});
  return {...row,categories:allocations,category:row.category?resolvedCategory(row.category):''};
});}
function personalCategories(){return [...new Set([...data.categories.map(resolvedCategory),...Object.keys(catMeta),...txs().flatMap(row=>[row.category,...Object.keys(row.categories||{})])].filter(Boolean))];}
function savePersonalCategory(root,original){
  const name=root.querySelector('#name').value.trim();if(!name)return 'Enter a category name.';
  if(categories().some(existing=>existing!==original&&existing.toLowerCase()===name.toLowerCase()))return 'A category with that name already exists.';
  const next=structuredClone(catMeta),aliases={...categoryAliases};
  const color=normalizeCardColor(root.querySelector('#card-color-hex').value);if(!color)return 'Enter a valid HEX color, for example #2C9B72.';
  next[name]={type:root.querySelector('#type').value,color};
  if(original&&original!==name){delete next[original];Object.keys(aliases).forEach(key=>{if(resolvedCategory(key)===original)aliases[key]=name;});delete aliases[name];aliases[original]=name;}
  try{commitWorkspace({'mw-category-meta':next,'mw-category-aliases':aliases});catMeta=next;categoryAliases=aliases;txFilters.category='';render();return '';}catch(error){return error.message;}
}
function useStarterCategories(){
  const starters=[['Salary','Income'],['Other income','Income'],['Food','Expense'],['Transport','Expense'],['Home & bills','Expense'],['Shopping','Expense'],['Health','Expense'],['Leisure','Expense']];
  const next={...catMeta};starters.forEach(([name,type],index)=>{if(!categories().includes(name))next[name]={type,color:C[index%C.length]};});
  try{commitWorkspace({'mw-category-meta':next});catMeta=next;render();notifyLedger('Starter categories added. You can rename or recolor any of them.');}catch(error){notifyLedger(error.message);}
}
function addQuickTransaction(type='expense',date=Finance.localDate(),card=''){
  modal(type==='income'?'Add income':'Add expense','Record it now; summaries update immediately.',transactionFields({type,date,card}),saveTx);
}
function nextMonth(month,offset=1){const date=new Date(`${month}-01T12:00:00`);date.setMonth(date.getMonth()+offset);return Finance.localDate(date).slice(0,7);}
function dueDateForMonth(card,month){const day=Number(card.dueDay||card.paymentDue?.slice(8,10));if(!Number.isInteger(day)||day<1||day>31)return null;const [year,m]=month.split('-').map(Number),last=new Date(year,m,0).getDate();return `${month}-${String(Math.min(day,last)).padStart(2,'0')}`;}
function upcomingDues(){const today=Finance.localDate(),month=today.slice(0,7);return cards().filter(card=>card.status!=='Completed').map(card=>{let date=dueDateForMonth(card,month);if(date&&date<today)date=dueDateForMonth(card,nextMonth(month));return {...card,date};}).filter(card=>card.date).sort((a,b)=>a.date.localeCompare(b.date));}
function monthlyBudgetEditor(){
  modal('Monthly spending budget',`For ${monthText(txMonth)}`,`<div class="field"><label for="monthly-budget">Spending limit (THB)</label><input type="number" id="monthly-budget" min="0" max="1000000000000" step=".01" value="${monthlyBudgets[txMonth]||''}" placeholder="e.g. 15000"></div><p class="ledger-hint">This compares your recorded expenses with the limit. Enter 0 to remove the budget.</p>`,root=>{
    const amount=Number(root.querySelector('#monthly-budget').value);if(!Number.isFinite(amount)||amount<0||amount>1e12)return 'Enter a valid budget.';
    const next={...monthlyBudgets,[txMonth]:Finance.money(amount)};try{commitWorkspace({'mw-budgets':next});monthlyBudgets=next;render();return '';}catch(error){return error.message;}
  });
}
function setupChecklist(){
  if(txs().length&&categories().length&&cards().length)return '';
  return `<section class="card getting-started"><div><span class="eyebrow">YOUR PERSONAL LEDGER</span><h3>${txs().length?'Make your ledger work for you':'A fresh start, ready for today'}</h3><p>Add categories, record income or spending, and connect a card whenever you need one.</p></div><div class="quick-actions">${!categories().length?'<button class="secondary" data-personal="starters">Use starter categories</button>':''}<button class="primary" data-personal="expense">＋ Add expense</button><button class="secondary" data-personal="income">＋ Add income</button>${!cards().length?'<button class="secondary" data-action="add-card">Add a card</button>':''}</div></section>`;
}
function monthFacts(rows){const days=Finance.daily(rows),highest=days.slice().sort((a,b)=>b.expense-a.expense)[0],sum=Finance.totals(rows);return `<section class="card month-facts"><div><span>Average / active day</span><b>${baht2(days.length?sum.expense/days.length:0)}</b></div><div><span>Highest spending day</span><b>${highest&&highest.expense?`${highest.date} · ${baht2(highest.expense)}`:'No spending yet'}</b></div><div><span>Tracked cards</span><b>${cards().length}</b></div><div><span>Active plans</span><b>${plans().filter(plan=>plan.status==='Ongoing').length}</b></div></section>`;}
function liveCardInsights(){
  const rows=txs().filter(row=>row.date.startsWith(txMonth)&&row.card&&row.expense>0),sum=Finance.totals(rows),ranked=cards().map(card=>({...card,spent:Finance.totals(rows.filter(row=>row.card===card.id)).expense})).sort((a,b)=>b.spent-a.spent),max=ranked[0]?.spent||1;
  return `<section class="card personal-card-insights"><div class="section-heading"><div><h3>Card spending</h3><p>${monthText(txMonth)} · recorded purchases</p></div><button class="link-button" data-personal-view="cards">View Cards →</button></div><div class="personal-highlight">${baht2(sum.expense)} <small>across ${ranked.filter(card=>card.spent>0).length} cards</small></div>${ranked.length?ranked.slice(0,4).map(card=>`<button class="live-card-row" data-card-activity="${esc(card.id)}"><span><i style="background:${card.color}"></i>${esc(card.name)}</span><span class="live-card-track"><i style="background:${card.color};width:${card.spent/max*100}%"></i></span><b>${baht2(card.spent)}</b></button>`).join(''):'<p class="empty-copy">Add a card, then select it when recording an expense.</p>'}<p class="ledger-hint">These are logged purchases. Statement balances and repayments are not inferred from them.</p></section>`;
}
function personalOverview(){
  const rows=txs().filter(row=>row.date.startsWith(txMonth)),sum=Finance.totals(rows),previousMonth=nextMonth(txMonth,-1),previousRows=txs().filter(row=>row.date.startsWith(previousMonth)),previous=Finance.totals(previousRows),budget=monthlyBudgets[txMonth]||0,percent=budget?sum.expense/budget*100:0;
  const recent=rows.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),last=txs().map(row=>row.date).sort().at(-1),commitment=plans().filter(plan=>plan.status==='Ongoing').reduce((total,plan)=>total+plan.monthly,0);
  const top=Object.entries(sum.categories).sort((a,b)=>b[1]-a[1]).slice(0,5),dues=upcomingDues().slice(0,3);
  const kpi=(label,value,kind,caption)=>`<div class="card kpi"><div class="kpi-label">${label}</div><div class="kpi-value ${kind}">${value}</div><div class="kpi-sub">${caption}</div></div>`;
  return `<div class="toolbar"><div><h2>Monthly overview</h2><p class="period">${last?`Last recorded: ${esc(last)}`:'No transactions recorded yet'}</p></div><div class="month-navigation"><button class="secondary" data-month-step="-1" aria-label="Previous month">←</button><select data-action="overview-month" aria-label="Overview month">${monthOptions(txMonth)}</select><button class="secondary" data-month-step="1" aria-label="Next month">→</button><button class="primary" data-action="add-tx">＋ Add transaction</button></div></div>
  ${setupChecklist()}<div class="kpis">${kpi('Income',baht2(sum.income),'positive','Recorded this month')}${kpi('Spending',baht2(sum.expense),'negative',previousRows.length?`${signedMoney(sum.expense-previous.expense)} vs previous month`:'No previous-month entries to compare')}${kpi('Net balance',signedMoney(sum.net),sum.net<0?'negative':'positive','Income less recorded spending')}${kpi('Active installment plans',baht2(commitment),'','Monthly commitment · not added to expenses automatically')}</div>
  ${monthFacts(rows)}<div class="personal-grid"><section class="card"><div class="section-heading"><div><h3>Monthly budget</h3><p>Your spending target for ${monthText(txMonth)}</p></div><button class="secondary" data-personal="budget">${budget?'Edit budget':'Set budget'}</button></div><div class="personal-highlight">${budget?signedMoney(budget-sum.expense):baht2(sum.expense)}<small>${budget?(sum.expense>budget?'over budget':'remaining'):'recorded spending'}</small></div><div class="budget-track" role="progressbar" aria-label="Monthly budget used" aria-valuenow="${Math.min(100,Math.round(percent))}" aria-valuemin="0" aria-valuemax="100"><i class="${percent>100?'over-budget':''}" style="width:${Math.min(100,percent)}%"></i></div><p class="ledger-hint">${budget?`${baht2(sum.expense)} of ${baht2(budget)} · ${percent.toFixed(0)}% used`:'Set a limit to track how much room you have left.'}</p></section>
  <section class="card"><div class="section-heading"><h3>Coming up</h3><span class="period">From today</span></div>${dues.length?dues.map(card=>`<div class="reminder-row"><span>${esc(card.name)}</span><b>${card.date}</b></div>`).join(''):'<p class="empty-copy">No upcoming card due dates. Add an optional due day in Cards.</p>'}<div class="quick-actions"><button class="secondary" data-personal="income">＋ Income</button><button class="secondary" data-personal="expense">＋ Expense</button></div></section></div>
  ${rows.length?monthlyActivityChart():'<section class="card empty-chart"><h3>Your monthly story starts here</h3><p>Your income and spending chart will appear as you record entries.</p></section>'}
  ${liveCardInsights()}${data.cardPayments.length?`<details class="workbook-history" ${workbookHistoryOpen?'open':''}><summary>Imported workbook payment history</summary>${cardInsights()}</details>`:''}
  <div class="personal-grid"><section class="card"><div class="section-heading"><h3>Spending by category</h3><button class="link-button" data-personal-view="categories">Manage →</button></div>${top.length?top.map(([name,amount])=>`<div class="category-total"><span><i style="background:${meta(name).color}"></i>${esc(name)}</span><b>${baht2(amount)}</b></div>`).join(''):'<p class="empty-copy">No categorized spending this month.</p>'}</section><section class="card"><div class="section-heading"><h3>Recent activity</h3><button class="link-button" data-personal-view="transactions">All entries →</button></div>${recent.length?recent.map(row=>`<button class="recent-row" data-personal-day="${row.date}"><span><strong>${esc(row.note||row.category||(row.source==='workbook'?'Workbook daily record':'Transaction'))}</strong><small>${row.date}</small></span><b class="${row.income?'positive':'negative'}">${signedMoney(row.income-row.expense)}</b></button>`).join(''):'<p class="empty-copy">Add your first income or expense to see it here.</p>'}</section></div>`;
}
function personalSettings(){
  modal('Data & settings','Manage this browser’s personal ledger.',`<div class="detail-summary"><div><span>Workspace</span><b>${workspace.mode==='fresh'?'Personal ledger':'Workbook + personal entries'}</b></div><div><span>Transactions</span><b>${txs().length}</b></div><div><span>Cards</span><b>${cards().length}</b></div></div><p class="ledger-hint">Save data keeps your workspace mode, transactions, cards, plans, categories, and budgets in a portable backup. Load data restores that workspace. Browser data does not sync between devices.</p><div class="entry-actions"><button class="primary" id="settings-save">Save data</button><button class="secondary" id="settings-load">Load data</button><button class="secondary danger-button" data-personal="reset">Clear data & start fresh</button></div>`,()=>'',true);
}
function bindPersonalWorkflows(){
  document.querySelector('.settings').onclick=personalSettings;
  document.querySelector('#clear-data-button').onclick=showClearWorkspace;
  document.addEventListener('toggle',event=>{if(event.target.isConnected&&event.target.matches('.workbook-history'))workbookHistoryOpen=event.target.open;},true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const action=button.dataset.personal;
    if(action==='reset')showClearWorkspace();if(action==='starters')useStarterCategories();if(action==='budget')monthlyBudgetEditor();if(action==='income'||action==='expense')addQuickTransaction(action);
    if(button.dataset.personalView){active=button.dataset.personalView;page=0;render();}
    if(button.dataset.monthStep){txMonth=nextMonth(txMonth,Number(button.dataset.monthStep));page=0;render();}
    if(button.dataset.personalDay)modal('Day details','Your recorded activity for this date.',transactionDetails(button.dataset.personalDay),()=>'',true);
    if(button.dataset.cardActivity){txMonth=active==='cards'?cardMonth:txMonth;txFilters={query:'',type:'expense',category:'',card:button.dataset.cardActivity};active='transactions';txMode='day';page=0;render();}
    if(button.dataset.calendarAdd)addQuickTransaction('expense',button.dataset.calendarAdd);
    if(button.dataset.planPaid)markPlanPaid(button.dataset.planPaid);
  });
}
function personalCardReport(cs){
  const rows=txs().filter(row=>row.date.startsWith(cardMonth)&&row.card),total=Finance.totals(rows);
  return `<div class="card-report"><div><span>Recorded card purchases</span><strong>${baht2(total.expense)}</strong></div><div><span>Transactions</span><strong>${rows.length}</strong></div><div><span>Cards used</span><strong>${new Set(rows.filter(row=>row.expense>0).map(row=>row.card)).size}</strong></div></div><div class="card-spend-summary">${cs.map(card=>`<button class="spend-chip" data-card-activity="${esc(card.id)}"><i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${card.color}"></i> ${esc(card.name)} <b>${baht2(Finance.totals(rows.filter(row=>row.card===card.id)).expense)}</b> →</button>`).join('')}</div>`;
}
function personalCalendar(cs){
  const first=new Date(`${cardMonth}-01T12:00:00`),start=new Date(first);start.setDate(1-first.getDay());
  const today=Finance.localDate(),rows=txs().filter(row=>row.date.startsWith(cardMonth)&&row.card&&row.expense>0),dues=new Map(cs.filter(card=>card.status!=='Completed').map(card=>[card.id,dueDateForMonth(card,cardMonth)]));
  let cells='';for(let index=0;index<42;index++){
    const date=new Date(start);date.setDate(start.getDate()+index);const iso=Finance.localDate(date),current=iso.startsWith(cardMonth),entries=rows.filter(row=>row.date===iso);
    const events=entries.map(row=>{const card=cs.find(card=>card.id===row.card);return `<button class="calendar-event" data-personal-day="${iso}" style="background:${card?.color||'#2c9b72'}" title="${esc(card?.name||'Card')}: ${baht2(row.expense)}">${esc(card?.name||'Card')} · ${baht2(row.expense)}</button>`;}).join('');
    const due=current?cs.filter(card=>dues.get(card.id)===iso).map(card=>`<div class="calendar-event due">${esc(card.name)} due</div>`).join(''):'';
    cells+=`<div class="calendar-day ${current?'':'muted'} ${iso===today?'today':''}"><span class="calendar-number">${date.getDate()}</span>${current?`<button class="calendar-add" data-calendar-add="${iso}" aria-label="Add expense on ${iso}">＋</button>`:''}${events}${due}</div>`;
  }
  return `<p class="ledger-hint">Select a purchase to see its details, or use ＋ to record an expense on that day. Due dates are reminders; payments are not posted automatically.</p><div class="calendar-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>`<div class="calendar-weekday">${day}</div>`).join('')}${cells}</div>`;
}
function savePersonalCard(root,id){
  const colors=['#card-color-hex','#card-color-hex-end'].map(selector=>{const input=root.querySelector(selector),value=normalizeCardColor(input.value);input.setAttribute('aria-invalid',String(!value));return value;});
  if(colors.some(value=>!value))return 'Enter a valid HEX color, for example #2C9B72.';
  const name=root.querySelector('#name').value.trim(),last4=root.querySelector('#last4').value.trim(),due=root.querySelector('#due').value,day=Number(due);
  if(!name||!/^\d{4}$/.test(last4))return 'Enter a card name and exactly four digits.';
  if(due&&(!Number.isInteger(day)||day<1||day>31))return 'Payment due day must be from 1 to 31.';
  const card={...(cards().find(card=>card.id===id)||{}),id:id||`user-${crypto.randomUUID()}`,name,last4,color:colors[0],color2:colors[1],kind:root.querySelector('#card-kind').value==='cash'?'cash':'credit',status:root.querySelector('#status').value,dueDay:day||null};
  card.paymentDue=day?dueDateForMonth(card,cardMonth):null;
  try{if(id?.startsWith('base-')){const next={...cardOverrides,[id]:card};commitWorkspace({'mw-card-overrides':next});cardOverrides=next;}
    else{const next=localCards.filter(card=>card.id!==id).concat(card);commitWorkspace({'mw-cards':next});localCards=next;}
    render();return '';
  }catch(error){return error.message;}
}
function planProgress(plan){const paid=Math.min(plan.months,Math.max(0,Number(plan.paidMonths)||0));return {paid,remaining:plan.months-paid,percent:paid/plan.months*100};}
function personalPlans(){return [...data.installments.map((plan,index)=>({...plan,id:`base-${index}`,...(planOverrides[`base-${index}`]||{})})),...localPlans].map(plan=>{const amount=Number(plan.amount||plan.total||0),months=Number(plan.months||1),rate=Number(plan.interestRate??plan.rate??0),calc=calcPlan(amount,months,rate);return {...plan,amount,months,rate,interestRate:rate,monthly:calc.monthly,total:calc.total,paidMonths:plan.status==='Completed'?months:Number(plan.paidMonths)||0};});}
function personalPlanForm(plan={}){
  const months=Number(plan.months)||10,amount=Number(plan.amount)||0,rate=Number(plan.rate)||0;
  return `<div class="form-section"><h4>INSTALLMENT DETAILS</h4><div class="form-grid"><div class="field full"><label for="name">Purchase name</label><input id="name" value="${esc(plan.name||'')}"></div><div class="field"><label for="plan-amount">Original amount (THB)</label><input id="plan-amount" type="number" min=".01" step=".01" value="${amount||''}"></div><div class="field"><label for="months">Term</label><select id="months">${[1,3,4,6,10,12,15,18,24,36].map(term=>`<option value="${term}" ${term===months?'selected':''}>${term} mo</option>`).join('')}</select></div><div class="field"><label for="rate">Interest rate / month</label><select id="rate">${[0,.59,.65,.69,.74].map(value=>`<option value="${value}" ${value===rate?'selected':''}>${value}%</option>`).join('')}</select></div><div class="field"><label for="monthly-no">Monthly w/o interest</label><input id="monthly-no" readonly></div><div class="field"><label for="monthly">Monthly with interest</label><input id="monthly" readonly></div><div class="field"><label for="total">Total with interest</label><input id="total" readonly></div><div class="field"><label for="plan-start">First payment month</label><input type="month" id="plan-start" value="${esc(plan.startMonth||Finance.localDate().slice(0,7))}"></div><div class="field"><label for="plan-paid">Payments already made</label><input type="number" id="plan-paid" min="0" max="${months}" step="1" value="${plan.paidMonths||0}"></div><div class="field"><label for="plan-card">Linked card (optional)</label><select id="plan-card"><option value="">No card</option>${cards().map(card=>`<option value="${esc(card.id)}" ${card.id===plan.card?'selected':''}>${esc(card.name)}</option>`).join('')}</select></div><div class="field"><label for="status">Status</label><select id="status">${['Ongoing','Plan','Completed'].map(value=>`<option ${value===(plan.status||'Ongoing')?'selected':''}>${value}</option>`).join('')}</select></div></div><p class="preview-box">Flat monthly interest: amount ÷ term + amount × rate / 100. Marking progress does not create an expense; record payments in Transactions when you make them.</p></div>`;
}
function persistPlan(plan){
  if(plan.id.startsWith('base-')){const next={...planOverrides,[plan.id]:plan};commitWorkspace({'mw-plan-overrides':next});planOverrides=next;}
  else{const next=localPlans.filter(row=>row.id!==plan.id).concat(plan);commitWorkspace({'mw-plans':next});localPlans=next;}
}
function savePersonalPlan(root,id){
  const name=root.querySelector('#name').value.trim(),amount=Number(root.querySelector('#plan-amount').value),months=Number(root.querySelector('#months').value),rate=Number(root.querySelector('#rate').value),paid=Number(root.querySelector('#plan-paid').value),start=root.querySelector('#plan-start').value;
  if(!name||!Number.isFinite(amount)||amount<=0||amount>1e12)return 'Enter a purchase name and a positive amount.';
  if(![1,3,4,6,10,12,15,18,24,36].includes(months)||![0,.59,.65,.69,.74].includes(rate))return 'Choose a supported term and interest rate.';
  if(!Number.isInteger(paid)||paid<0||paid>months)return 'Payments made must be between 0 and the term.';
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(start))return 'Choose the first payment month.';
  const status=root.querySelector('#status').value,card=root.querySelector('#plan-card').value;
  if(card&&!cards().some(row=>row.id===card))return 'Choose an existing card.';
  const calc=calcPlan(amount,months,rate),plan={id:id||`plan-${crypto.randomUUID()}`,name,amount,months,rate,interestRate:rate,monthly:calc.monthly,total:calc.total,startMonth:start,paidMonths:status==='Completed'?months:paid,card,status:paid===months?'Completed':status};
  try{persistPlan(plan);render();return '';}catch(error){return error.message;}
}
function markPlanPaid(id){const plan=plans().find(row=>row.id===id);if(!plan||plan.status!=='Ongoing')return;const {paid}=planProgress(plan),next={...plan,paidMonths:Math.min(plan.months,paid+1)};if(next.paidMonths===plan.months)next.status='Completed';try{persistPlan(next);render();notifyLedger('Plan progress updated. Record the actual payment separately in Transactions.');}catch(error){notifyLedger(error.message);}}
function personalInstallments(){
  const list=plans().filter(plan=>plan.name),ongoing=list.filter(plan=>plan.status==='Ongoing'),commitment=ongoing.reduce((sum,plan)=>sum+plan.monthly,0);
  return `<div class="toolbar"><div><h2>Installment planner</h2><p class="period">Track monthly commitments and payment progress</p></div><button class="primary" data-action="add-plan">＋ Add plan</button></div><div class="installment-total"><span>Active monthly commitment · ${ongoing.length} plans</span><strong>${baht2(commitment)} / month</strong></div>${!list.length?'<section class="card empty-chart"><h3>No installment plans yet</h3><p>Add a purchase to calculate the monthly cost and track payments.</p></section>':`<div class="plan-board">${list.map(plan=>{const progress=planProgress(plan),linked=cards().find(card=>card.id===plan.card),next=plan.startMonth&&progress.remaining?nextMonth(plan.startMonth,progress.paid):null;return `<article class="card plan-card"><div class="section-heading"><span class="pill ${plan.status.toLowerCase()}">${esc(plan.status)}</span><span class="period">${plan.months} months · ${plan.rate}% / month</span></div><h3>${esc(plan.name)}</h3><div class="personal-highlight">${baht2(plan.monthly)}<small>per month · ${baht2(plan.total)} total</small></div><div class="budget-track"><i style="width:${progress.percent}%"></i></div><p class="ledger-hint">${progress.paid} of ${plan.months} payments marked${next?` · next planned month ${next}`:''}${linked?` · ${esc(linked.name)}`:''}</p><div class="entry-actions"><button class="secondary" data-detail-plan="${esc(plan.id)}">Details</button><button class="secondary" data-edit-plan="${esc(plan.id)}">Edit</button>${plan.status==='Ongoing'?`<button class="primary" data-plan-paid="${esc(plan.id)}">Mark month paid</button>`:''}</div></article>`;}).join('')}</div>`}`;
}
function personalPlanDetail(plan){const calc=calcPlan(plan.amount,plan.months,plan.rate),progress=planProgress(plan);return `<div class="detail-summary"><div><span>Purchase</span><b>${esc(plan.name)}</b></div><div><span>Status</span><b>${esc(plan.status)}</b></div><div><span>Progress</span><b>${progress.paid} / ${plan.months} payments</b></div></div><div class="detail-metrics"><div><span>Original amount</span><b>${baht2(plan.amount)}</b></div><div><span>Interest rate</span><b>${plan.rate}% / month</b></div><div><span>Monthly w/o interest</span><b>${baht2(calc.no)}</b></div><div><span>Monthly with interest</span><b>${baht2(calc.monthly)}</b></div><div><span>Total interest</span><b>${baht2(calc.interest*plan.months)}</b></div><div><span>Remaining planned payments</span><b>${baht2(calc.monthly*progress.remaining)}</b></div></div><p class="ledger-hint">Progress is tracked manually and does not post expenses automatically.</p>`;}
function personalCategoriesView(){
  const rows=txs().filter(row=>row.date.startsWith(txMonth));
  return `<div class="toolbar"><div><h2>Categories</h2><p class="period">Colors, types, and usage · ${monthText(txMonth)}</p></div><button class="primary" data-action="add-category">＋ New category</button></div>${!categories().length?'<section class="card empty-chart"><h3>Organize your first transactions</h3><p>Create your own categories, or add a starter set that you can edit.</p><button class="secondary" data-personal="starters">Use starter categories</button></section>':`<div class="category-board">${categories().map(name=>{const info=meta(name),used=rows.filter(row=>row.category===name||Math.abs(row.categories?.[name]||0)>0),spend=used.reduce((total,row)=>total+Math.abs(row.categories?.[name]||0),0),income=used.filter(row=>row.category===name).reduce((total,row)=>total+row.income,0);return `<article class="category-tile"><i class="category-swatch" style="background:${info.color}"></i><div><strong>${esc(name)}</strong><small>${esc(info.type)} · ${used.length} entries</small><p class="category-usage">${info.type==='Income'?baht2(income):baht2(spend)} ${info.type==='Income'?'income':'spending'}</p></div><button class="edit-row" data-edit-category="${esc(name)}">Edit</button></article>`;}).join('')}</div>`}`;
}
function personalCategoryForm(name='',info=meta(name)){return `<div class="form-section"><div class="form-grid"><div class="field full"><label for="name">Category name</label><input id="name" value="${esc(name)}" maxlength="80" placeholder="e.g. Food"></div><div class="field full"><label for="type">Type</label><select id="type">${['Expense','Income','Both'].map(type=>`<option ${type===info.type?'selected':''}>${type}</option>`).join('')}</select></div></div>${cardColorField(info.color||C[0],'','Category color')}<p class="ledger-hint">Renaming updates the category shown on existing transactions.</p></div>`;}
