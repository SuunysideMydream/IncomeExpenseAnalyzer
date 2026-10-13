const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const F = require('../finance-core.js');
const workbook = JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data.json'),'utf8'));
const entry = (extra={}) => ({date:'2026-10-13',income:0,expense:12.34,categories:{Lunch:12.34},note:'Lunch',...extra});

test('imported records retain stable IDs and edits never mutate workbook data',()=>{
  const original = JSON.stringify(workbook.records);
  const before = F.records(workbook.records);
  const target = before.find(row=>row.expense>0);
  const after = F.records(workbook.records,[],{[target.id]:{...target,note:'Corrected'}});
  assert.equal(after.find(row=>row.id===target.id).note,'Corrected');
  assert.equal(JSON.stringify(workbook.records),original);
  assert.equal(new Set(before.map(row=>row.id)).size,before.length);
  assert.equal(F.records(workbook.records,[],{[target.id]:{deleted:true}}).length,before.length-1);
});
test('legacy local entries have deterministic IDs, with no discarded entries',()=>{
  assert.deepEqual(F.records([], [entry(),entry()]).map(row=>row.id),['legacy-0','legacy-1']);
});
test('daily and monthly totals agree, including mixed income and expense days',()=>{
  const rows=[entry({income:100}),entry({expense:.1,categories:{Lunch:.1}}),entry({expense:.2,categories:{Lunch:.2}})];
  const sum=F.totals(rows),day=F.daily(rows)[0],month=F.monthly(rows).find(row=>row.month==='2026-10');
  assert.equal(sum.expense,12.64);assert.equal(sum.net,87.36);
  assert.equal(day.expense,month.expense);assert.equal(day.income,100);
  assert.equal(sum.categories.Lunch,12.64);
});
test('all workbook categories fit daily spending and monthly totals reconcile',()=>{
  for(const month of workbook.months){
    const rows=workbook.records.filter(row=>row.date.startsWith(month.month));
    const sum=F.totals(rows);
    assert.ok(Math.abs(sum.expense-month.expense)<.02,`${month.month} expenses`);
    assert.ok(Math.abs(sum.income-month.income)<.02,`${month.month} income`);
  }
  for(const row of workbook.records) assert.ok(Object.values(row.categories||{}).reduce((n,v)=>n+Math.abs(v),0)<=row.expense+.02);
});
test('new and empty current months remain selectable',()=>{
  const months=F.months([entry({date:'2030-01-01'})],['2024-01'],'2026-10-13');
  assert.deepEqual(months,['2024-01','2026-10','2030-01']);
});
test('filters intersect and preserve complete imported daily records',()=>{
  const rows=[entry({income:100,card:'card-1',note:'Cafe & lunch'}),entry({date:'2026-09-12'}),entry({note:'Train',categories:{Transport:12.34}})];
  const matches=F.filter(rows,{month:'2026-10',query:'CAFE',type:'income',category:'Lunch',card:'card-1'});
  assert.equal(matches.length,1);assert.equal(matches[0].expense,12.34);
  assert.equal(F.filter(rows,{card:'cash'}).length,2);
  assert.equal(F.filter(rows,{query:'Blue card'},[{id:'card-1',name:'Blue card'}]).length,1);
});
test('validation rejects invalid dates, amounts, and excess allocations',()=>{
  for(const patch of [{date:'2026-02-30'},{expense:-1},{expense:Infinity},{expense:NaN},{expense:0,income:0},{categories:{Lunch:20}},{note:{bad:true}}]) assert.throws(()=>F.validateTransaction(entry(patch)));
  assert.equal(F.validDate('2024-02-29'),true);
  assert.doesNotThrow(()=>F.validateTransaction(entry({income:100,expense:12.34})));
});
test('local dates retain the displayed calendar day',()=>{
  assert.equal(F.localDate(new Date(2026,9,13,0,1)),'2026-10-13');
});
test('CSV preserves precision, quotes and unicode; guards spreadsheet formulas',()=>{
  const csv=F.csv([entry({note:'=HYPERLINK("bad")',categories:{'อาหาร, lunch':12.34}})]);
  assert.ok(csv.startsWith('\uFEFF"Date"'));
  assert.ok(csv.includes('"12.34"'));
  assert.ok(csv.includes("' =")===false);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('""bad""'));
  assert.ok(csv.includes('อาหาร, lunch: 12.34'));
});
test('text escaping protects form values and transaction notes',()=>{
  assert.equal(F.escape('<img src="x"> &'), '&lt;img src=&quot;x&quot;&gt; &amp;');
});
