function cardBackground(card) {
  const start=normalizeCardColor(card.color)||'#2C9B72',end=normalizeCardColor(card.color2)||'#17211F';
  return `linear-gradient(0deg,rgba(0,0,0,.28),transparent 85%),linear-gradient(135deg,${start},${end})`;
}
function walletCardFace(card,preview=false) {
  const cash=card.kind==='cash';
  return `<div ${preview?'id="card-preview"':''} class="credit-card ${cash?'cash-card':''} ${preview?'mini-card':''}" style="background:${cardBackground(card)}">
    <span class="card-sheen" aria-hidden="true"></span><span class="wallet-type-label" data-preview-kind>${cash?'Cash card':'Credit card'}</span>
    <div class="card-chip"></div><div class="card-number" data-preview-last4>•••• ${esc(card.last4||'1234')}</div>
    <div class="card-footer"><div><b data-preview-name>${esc(card.name||'Your card')}</b><span>${esc(preview?'Preview':card.status||'Active')}</span></div>
    ${preview?'':`<button class="edit-row wallet-edit" data-edit-card="${esc(card.id)}" aria-label="Edit ${esc(card.name)}">Edit</button>`}</div></div>`;
}
function walletSections() {
  return ['credit','cash'].map(kind=>{
    const group=cards().filter(card=>card.kind===kind),title=kind==='cash'?'Cash cards':'Credit cards';
    return `<section class="wallet-section" aria-labelledby="wallet-${kind}-title"><div class="wallet-section-head"><div><h3 id="wallet-${kind}-title">${title} <span>${group.length}</span></h3><p>${kind==='cash'?'Your cash cards, with a distinctive polygon design.':'Your credit cards, with the familiar circular design.'}</p></div>
      <button type="button" class="secondary" data-add-wallet-kind="${kind}">＋ ${kind==='cash'?'Add cash card':'Add credit card'}</button></div>
      ${group.length?`<div class="card-wallet">${group.map(card=>walletCardFace(card)).join('')}</div>`:`<div class="wallet-empty">No ${title.toLowerCase()} yet. Add one to start tracking its spending.</div>`}</section>`;
  }).join('');
}
function walletCardForm(card={}) {
  return `<div class="form-section"><h4>CARD DETAILS</h4><div class="form-grid">
    <div class="field"><label for="name">Card name</label><input id="name" value="${esc(card.name||'')}" placeholder="e.g. My everyday card"></div>
    <div class="field"><label for="last4">Last 4 digits</label><input id="last4" value="${esc(card.last4||'')}" maxlength="4" inputmode="numeric" placeholder="1234"></div>
    <div class="field"><label for="card-kind">Card type</label><select id="card-kind"><option value="credit" ${card.kind!=='cash'?'selected':''}>Credit card</option><option value="cash" ${card.kind==='cash'?'selected':''}>Cash card</option></select></div>
    <div class="field"><label for="due">Payment due day (optional)</label><input id="due" type="number" min="1" max="31" value="${card.paymentDue?Number(card.paymentDue.slice(8,10)):''}"></div>
    <div class="field full"><label for="status">Status</label><select id="status">${['Active','Plan','Completed'].map(value=>`<option ${value===(card.status||'Active')?'selected':''}>${value}</option>`).join('')}</select></div>
    </div><div class="card-preview-wrap"><span>LIVE PREVIEW</span>${walletCardFace(card,true)}</div>
    <div class="gradient-heading"><h4>TWO-COLOR GRADIENT</h4><p>Choose a start and end color to make this card yours.</p></div>
    <div class="card-gradient-editors">${cardColorField(card.color||C[0],'','Gradient start')}${cardColorField(card.color2||'#17211F','-end','Gradient end')}</div></div>`;
}
function setupWalletPreview(root) {
  const update=()=>{
    const preview=root.querySelector('#card-preview'),kind=root.querySelector('#card-kind').value;
    preview.style.background=cardBackground({color:root.querySelector('#color').value,color2:root.querySelector('#color-end').value});
    preview.classList.toggle('cash-card',kind==='cash');
    preview.querySelector('[data-preview-kind]').textContent=kind==='cash'?'Cash card':'Credit card';
    preview.querySelector('[data-preview-name]').textContent=root.querySelector('#name').value||'Your card';
    preview.querySelector('[data-preview-last4]').textContent=`•••• ${(root.querySelector('#last4').value||'1234').padEnd(4,'•')}`;
  };
  ['#color','#color-end','#name','#last4'].forEach(selector=>root.querySelector(selector).addEventListener('input',update));
  root.querySelector('#card-kind').addEventListener('change',update);
  setupCardColorPicker(root);update();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-add-wallet-kind]');if(!button)return;
  modal(button.dataset.addWalletKind==='cash'?'Add cash card':'Add credit card','Choose a card type and two colors for your wallet.',cardForm({kind:button.dataset.addWalletKind}),saveCard);
});
