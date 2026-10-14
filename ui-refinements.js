function normalizeCardColor(value) {
  const hex=String(value||'').trim().replace(/^#/,'');
  if (/^[0-9a-f]{3}$/i.test(hex)) return '#'+[...hex].map(char=>char+char).join('').toUpperCase();
  return /^[0-9a-f]{6}$/i.test(hex)?'#'+hex.toUpperCase():null;
}
function cardColorField(value, suffix='', label='Card color') {
  const color=normalizeCardColor(value)||'#2C9B72';
  const presets=['#2C9B72','#397C86','#4D79B8','#9A78CE','#BC6088','#DF725F','#C58A39','#27394D'];
  const markup=`<div class="field full card-color-field"><label for="card-color-hex">${label}</label><div class="card-color-editor">
    <input id="color" type="hidden" value="${color}">
    <div class="card-color-top"><span class="card-color-swatch" aria-hidden="true" style="background:${color}"></span><div class="card-hex-field"><label for="card-color-hex">HEX code</label><input id="card-color-hex" type="text" value="${color}" placeholder="#2C9B72" maxlength="7" spellcheck="false" autocomplete="off" aria-describedby="card-color-help"></div></div>
    <div class="card-color-presets" role="group" aria-label="Suggested card colors">${presets.map(hex=>`<button type="button" class="card-color-preset" data-card-color="${hex}" style="--swatch:${hex}" aria-label="Use ${hex}" aria-pressed="${color===hex}"></button>`).join('')}</div>
    <details class="card-color-adjust"><summary>Fine-tune color</summary>${['Red','Green','Blue'].map((name,index)=>`<label class="card-color-channel" for="card-color-${index}"><span>${name}</span><input id="card-color-${index}" data-color-channel="${index}" type="range" min="0" max="255" step="1" value="${parseInt(color.slice(1+index*2,3+index*2),16)}"><output for="card-color-${index}"></output></label>`).join('')}</details>
    <small id="card-color-help">Enter 3 or 6 HEX digits, with or without #.</small></div></div>`;
  return markup.replace(/(id|for|aria-describedby)="([^"]+)"/g,(_,attribute,id)=>`${attribute}="${id}${suffix}"`);
}
function setupCardColorPicker(root) {
  root.querySelectorAll('.card-color-field').forEach(setupCardColorStop);
}
function setupCardColorStop(root) {
  const color=root.querySelector('input[type=hidden]'),hex=root.querySelector('input[type=text]');
  if(!hex)return;
  const sliders=[...root.querySelectorAll('[data-color-channel]')];
  const update=(value,format=true)=>{
    const normalized=normalizeCardColor(value);if(!normalized)return false;
    color.value=normalized;
    if(format)hex.value=normalized;
    hex.setAttribute('aria-invalid','false');
    const modalRoot=root.closest('.modal'),error=modalRoot?.querySelector('.modal-error');
    if(error?.textContent==='Enter a valid HEX color, for example #2C9B72.'&&[...modalRoot.querySelectorAll('.card-hex-field input')].every(input=>normalizeCardColor(input.value)))error.textContent='';
    root.querySelector('.card-color-swatch').style.background=normalized;
    const rgb=[0,1,2].map(index=>parseInt(normalized.slice(1+index*2,3+index*2),16));
    sliders.forEach((slider,index)=>{
      slider.value=rgb[index];slider.nextElementSibling.value=rgb[index];
      const start=rgb.slice(),end=rgb.slice();start[index]=0;end[index]=255;
      slider.style.setProperty('--channel-track',`linear-gradient(to right,rgb(${start.join(',')}),rgb(${end.join(',')}))`);
    });
    root.querySelectorAll('[data-card-color]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cardColor===normalized)));
    color.dispatchEvent(new Event('input',{bubbles:true}));return true;
  };
  hex.addEventListener('input',()=>update(hex.value,false));
  hex.addEventListener('blur',()=>{if(!update(hex.value))hex.setAttribute('aria-invalid','true')});
  sliders.forEach(slider=>slider.addEventListener('input',()=>update('#'+sliders.map(input=>Number(input.value).toString(16).padStart(2,'0')).join(''))));
  root.querySelectorAll('[data-card-color]').forEach(button=>button.addEventListener('click',()=>update(button.dataset.cardColor)));
  update(color.value);
}

/* Progressive enhancement: native selects retain values and form behavior. */
(() => {
  const enhanced = new WeakMap(), segmentPositions = new Map();
  let current = null, serial = 0, typeBuffer = '', typeTime = 0, restoreControl = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
  const labelFor = select => {
    const label = select.labels?.[0] || select.parentElement.querySelector('label');
    if (label) { const copy = label.cloneNode(true); copy.querySelectorAll('select,button,.ui-select').forEach(el => el.remove()); if (copy.textContent.trim()) return copy.textContent.trim(); }
    return select.getAttribute('aria-label') || ({'overview-month':'Overview month','card-month':'Calendar month','tx-month':'Transaction month'}[select.dataset.action]) || select.id?.replaceAll('-',' ') || 'Choose an option';
  };
  function closeMenu(restoreFocus = false) {
    if (!current) return;
    const {button,menu} = current;
    button.setAttribute('aria-expanded','false');
    button.removeAttribute('aria-activedescendant'); button.removeAttribute('aria-controls');
    menu.remove(); current = null; typeBuffer = '';
    if (restoreFocus && button.isConnected) button.focus();
  }
  function positionMenu() {
    if (!current) return;
    const {button,menu} = current, rect = button.getBoundingClientRect();
    const below = innerHeight - rect.bottom - 16, above = rect.top - 16;
    const up = below < 220 && above > below;
    const height = Math.max(80,Math.min(300,up ? above : below));
    const width = Math.min(Math.max(rect.width,220),innerWidth - 24);
    menu.style.width = `${width}px`; menu.style.maxHeight = `${height}px`;
    menu.style.left = `${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;
    menu.style.top = `${up ? Math.max(12,rect.top-menu.offsetHeight-8) : rect.bottom+8}px`;
    menu.style.transformOrigin = up ? 'bottom left' : 'top left';
  }
  function highlight(index) {
    if (!current) return;
    const {menu,button} = current, options = [...menu.children];
    if (!options[index] || options[index].getAttribute('aria-disabled') === 'true') return;
    current.index = index;
    options.forEach((option,i) => option.classList.toggle('is-highlighted',i===index));
    button.setAttribute('aria-activedescendant',options[index].id);
    options[index].scrollIntoView({block:'nearest'});
  }
  function commit(index) {
    if (!current) return;
    const {select,sync} = current;
    if (!select.options[index] || select.options[index].disabled) return;
    const changed = select.selectedIndex !== index;
    select.selectedIndex = index; sync(); closeMenu(true);
    if (changed) { select.dispatchEvent(new Event('input',{bubbles:true})); select.dispatchEvent(new Event('change',{bubbles:true})); }
  }
  function openMenu(state) {
    closeMenu();
    const {select,button} = state;
    if (select.disabled) return;
    const menu = document.createElement('div'); menu.className='ui-select-menu'; menu.id=`ui-options-${++serial}`;
    menu.setAttribute('role','listbox');menu.setAttribute('aria-label',state.label);
    [...select.options].forEach((option,index) => {
      const row = document.createElement('div'); row.className='ui-option'; row.id=`${menu.id}-${index}`;
      row.setAttribute('role','option');row.setAttribute('aria-selected',String(index===select.selectedIndex));row.setAttribute('aria-disabled',String(option.disabled));
      row.textContent=option.textContent;
      row.addEventListener('pointermove',()=>highlight(index));
      row.addEventListener('pointerdown',event=>event.preventDefault());
      row.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();commit(index)});
      menu.append(row);
    });
    document.body.append(menu); current={...state,menu,index:select.selectedIndex};
    button.setAttribute('aria-expanded','true');button.setAttribute('aria-controls',menu.id);
    positionMenu();highlight(select.selectedIndex);button.focus();
    if (!reduced()) menu.animate([{opacity:0,transform:'translateY(4px) scale(.98)'},{opacity:1,transform:'none'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function enhanceSelect(select) {
    if (select.multiple || select.size>1) return;
    if (enhanced.has(select)) {enhanced.get(select).sync();return;}
    const label=labelFor(select), wrapper=document.createElement('span'), button=document.createElement('button');
    wrapper.className='ui-select';button.className='ui-select-trigger';button.type='button';
    button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label',label);
    button.innerHTML=`<span class="ui-select-value"></span>${chevron}`;
    select.before(wrapper);wrapper.append(select,button);select.classList.add('ui-native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    const sync=()=>{button.querySelector('.ui-select-value').textContent=select.selectedOptions[0]?.textContent || 'Choose…';button.disabled=select.disabled;};
    const state={select,button,wrapper,label,sync};enhanced.set(select,state);sync();
    [...select.labels].forEach(label=>label.addEventListener('click',event=>{if(event.target.closest('button'))return;event.preventDefault();button.focus()}));
    button.addEventListener('click',event=>{event.preventDefault();current?.select===select?closeMenu(true):openMenu(state)});
    button.addEventListener('keydown',event=>{
      if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
        event.preventDefault();const wasOpen=current?.select===select;if(!wasOpen)openMenu(state);
        const available=[...select.options].map((option,index)=>option.disabled?-1:index).filter(i=>i>=0);
        let at=available.indexOf(current.index);
        if(event.key==='Home')at=0;else if(event.key==='End')at=available.length-1;else if(wasOpen)at=Math.max(0,Math.min(available.length-1,at+(event.key==='ArrowDown'?1:-1)));
        highlight(available[at]);
      } else if((event.key==='Enter'||event.key===' ') && current?.select===select){event.preventDefault();commit(current.index)}
      else if(event.key.length===1 && !event.ctrlKey && !event.metaKey && event.key!==' '){
        event.preventDefault();if(current?.select!==select)openMenu(state);
        typeBuffer=performance.now()-typeTime>700?event.key:typeBuffer+event.key;typeTime=performance.now();
        const index=[...select.options].findIndex(option=>!option.disabled&&option.textContent.toLowerCase().startsWith(typeBuffer.toLowerCase()));if(index>=0)highlight(index);
      }
    });
    select.addEventListener('change',sync);
  }
  document.addEventListener('keydown',event=>{
    if(!current)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMenu(true)}
    else if(event.key==='Tab')closeMenu();
  },true);
  document.addEventListener('pointerdown',event=>{if(current&&!current.wrapper.contains(event.target)&&!current.menu.contains(event.target))closeMenu()},true);
  document.addEventListener('scroll',event=>{if(current&&!current.menu.contains(event.target))positionMenu()},true);
  window.addEventListener('resize',()=>{positionMenu();positionSegments(document,false)});
  document.fonts?.ready.then(()=>positionSegments(document,false));
  document.addEventListener('change',()=>queueMicrotask(()=>document.querySelectorAll('select').forEach(enhanceSelect)));

  const groupKey = group => group.querySelector('button')?.dataset.action || group.querySelector('button')?.dataset.cardMode;
  function positionSegments(root,animate=true) {
    root.querySelectorAll('.view-switch').forEach(group=>{
      const buttons=[...group.querySelectorAll('button')],active=buttons.find(button=>button.classList.contains('active'));
      if(!active)return;
      group.classList.add('ui-segments');group.setAttribute('role','group');
      group.setAttribute('aria-label',group.getAttribute('aria-label') || 'Transaction view');
      buttons.forEach(button=>{button.setAttribute('aria-pressed',String(button===active));if(!button.dataset.segmentKeybound){button.dataset.segmentKeybound='true';button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();let next=buttons.indexOf(button)+(event.key==='ArrowLeft'?-1:1);if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;const target=buttons[(next+buttons.length)%buttons.length];target.focus();target.click()}})}});
      let marker=group.querySelector('.segment-marker');if(!marker){marker=document.createElement('span');marker.className='segment-marker';marker.setAttribute('aria-hidden','true');group.prepend(marker);}
      const to={x:active.offsetLeft,y:active.offsetTop,width:active.offsetWidth,height:active.offsetHeight},key=groupKey(group),from=segmentPositions.get(key);
      Object.assign(marker.style,{left:`${to.x}px`,top:`${to.y}px`,width:`${to.width}px`,height:`${to.height}px`});
      if(animate&&from&&!reduced())marker.animate([{transform:`translate(${from.x-to.x}px,${from.y-to.y}px) scaleX(${from.width/to.width})`},{transform:'none'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
      segmentPositions.set(key,to);
    });
  }
  window.captureUiState=()=>{
    const focused=document.activeElement;
    const select=focused?.classList.contains('ui-select-trigger')?focused.parentElement.querySelector('select'):null;
    restoreControl=select?{kind:'select',key:select.id||select.name||select.dataset.action}:
      focused?.closest('.view-switch')?{kind:'segment',key:focused.dataset.action||focused.dataset.cardMode}:null;
    closeMenu();
    document.querySelectorAll('.ui-segments').forEach(group=>{const marker=group.querySelector('.segment-marker');if(!marker)return;const r=marker.getBoundingClientRect(),g=group.getBoundingClientRect();segmentPositions.set(groupKey(group),{x:r.left-g.left,y:r.top-g.top,width:r.width,height:r.height})});
  };
  const chartObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('ui-chart-visible');chartObserver.unobserve(entry.target)}})},{threshold:.15});
  const observed=new Set();
  window.refineUI=(root=document)=>{
    if(current&&!current.select.isConnected)closeMenu();
    root.querySelectorAll('select').forEach(enhanceSelect);
    positionSegments(root);
    if(root.id==='app'&&restoreControl){
      const {kind,key}=restoreControl;restoreControl=null;
      const target=kind==='select'?[...root.querySelectorAll('select')].find(select=>(select.id||select.name||select.dataset.action)===key):
        [...root.querySelectorAll('.view-switch button')].find(button=>(button.dataset.action||button.dataset.cardMode)===key);
      (kind==='select'?enhanced.get(target)?.button:target)?.focus({preventScroll:true});
    }
    for(const node of observed)if(!node.isConnected){chartObserver.unobserve(node);observed.delete(node)}
    root.querySelectorAll('.activity-bars,.card-payment-bars,.payment-chart-wrap').forEach(chart=>{
      if(chart.dataset.uiMotion)return;chart.dataset.uiMotion='true';
      chart.querySelectorAll('.activity-pair i,.payment-track i,.payment-line').forEach((mark,index)=>{
        mark.style.setProperty('--chart-delay',`${Math.min(index*35,245)+60}ms`);
        if(mark.classList.contains('payment-line')){const length=mark.getTotalLength();mark.style.setProperty('--line-length',length);}
      });
      observed.add(chart);chartObserver.observe(chart);
    });
  };
})();
