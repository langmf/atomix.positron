'use strict';

const HTML_reset = '<button type="button" class="btn btn-primary btn-sm me-5" style="width:max-content;" onclick="HLT_input(this);">Reset</button>';


let STS = {};

async function STS_export() {	await vscode_Eval(-1).await.STS.Export();	}

async function STS_import() {	await vscode_Eval(-1).await.STS.Import();						await STS_update();	}

async function STS_reset()	{	await vscode_Eval().STS.Update(null);							await STS_update();	}

async function STS_edit(s)	{	await vscode_Eval().STS.Settings(s ? { [s]:STS[s] } : STS);		await STS_update();	}

async function STS_update() {	
	STS = await vscode_Eval().STS.Settings();
	await HLT_update();
	await EDT_update();
	HDR_update();
}



async function HLT_addtitle(el) {
	const n = el.innerText;			STS.titles[n] = STS.titles[n] || '';			await STS_edit('titles');
}

async function HLT_title(el) {
	if (typeof el === 'string') { delete STS.titles[el];		await STS_edit('titles');		return; }

	const k = el.getAttribute('data-title'),   t = STS.titles;

	if ((t[k] ? t[k] : k ) !== el.value) { t[k] = el.value;		await STS_edit('titles'); }
}

function HLT_input(el) {
	clearTimeout(HLT_input.tmr);

	HLT_input.tmr = setTimeout(async () => {
		let id = '',   p = el;

		while ((p = p.parentElement) && !(id = (p.getAttribute('id') || '')).startsWith('$')) {};
		
		const x = {},   r = objectPath(STS.themes, id.slice(1).replace('$')),   n = { change:1, fontStyle:'' };

		if (el.type === 'button' && el.innerText === 'Reset') { delete r.change;    return STS_edit(); }

		for (const c of p.children) {
			if (c.tagName !== 'LABEL') {
				if (c.type === 'checkbox') n.enable = c.checked;
			} else {
				const f = c.firstChild;
				if (f.type === 'checkbox') {
					const s = c.innerText.toLowerCase();		x[s] = f.checked ? s : '';
					if (f.checked) n.fontStyle = n.fontStyle + ' ' + s;
				}
				if (f.type === 'color') (x.$ = c.lastChild).lastChild.nodeValue = x.color = n.foreground = f.value.toUpperCase();
			}
		}

		x.$.style.color			 = x.color;
		x.$.style.fontWeight     = x.bold;
		x.$.style.fontStyle      = x.italic;
		x.$.style.textDecoration = x.underline;

		n.fontStyle = n.fontStyle.trim();		if (!r.change) $(p).append(HTML_reset);			Object.assign(r, n);

		await vscode_Eval().STS.Update(STS);
	}, 200);
}

async function HLT_update() {
	let out,   titles = await vscode_Eval().DTB.db.default.titles.$;

	for (const [theme, data] of Object.entries(STS.themes)) {
		out = '';

		for (const [k,v] of Object.entries(data)) {
			const s = v.fontStyle.split(/[\t ]+/g).reduce((a,v) => (v && (v = v.toLowerCase()) && (a[v]=v), a), {});
			const title = STS.titles[k] || titles[k] || k;

			out += `<li class="list-group-item d-flex flex-wrap align-items-center" id="$${theme}.${k}">			
						<input type="checkbox" class="form-check-input me-3" ${v.enable?'checked':''} oninput="HLT_input(this);" />
						<input type="text" class="form-control input-sm flex-fill border-0 me-3" style="max-width:250px;" value="${title}" data-title="${k}" onblur="HLT_title(this);" onkeyup="(event.keyCode===13&&HLT_title(this))" />
						<label class="me-4 flex-fill" style="max-width:120px;"><input type="color" class="me-2" list="" value="${v.foreground}" oninput="HLT_input(this);" /><span style="text-underline-position:under;color:${v.foreground};font-weight:${s.bold||''};font-style:${s.italic||''};text-decoration:${s.underline||''};">${v.foreground.toUpperCase()}</span></label>
						<label class="me-5"><input type="checkbox" class="form-check-input me-2" ${s.bold?'checked':''}       oninput="HLT_input(this);" />Bold</label>
						<label class="me-5"><input type="checkbox" class="form-check-input me-2" ${s.italic?'checked':''}     oninput="HLT_input(this);" />Italic</label>
						<label class="me-5"><input type="checkbox" class="form-check-input me-2" ${s.underline?'checked':''}  oninput="HLT_input(this);" />Underline</label>
						${v.change ? HTML_reset : ''}
					</li>`;
		}

		$('#nav-' + theme).html('<ul class="list-group mt-3">' + out + '</ul>');
	}


	out = '';
	for (const [k, title] of Object.entries(STS.titles)) {
			out += `<li class="list-group-item d-flex flex-wrap align-items-center" id="$${k}">			
						<span class="flex-fill me-4" style="max-width:250px;">${k}</span>
						<input type="text" class="form-control input-sm me-5 my-3 my-sm-1" style="max-width:250px;" value="${title}" data-title="${k}" onblur="HLT_title(this);" onkeyup="(event.keyCode===13&&HLT_title(this))" />
						<button type="button" class="btn btn-primary btn-sm" style="width:max-content;" onclick="HLT_title('${k}');">Remove</button>
					</li>`;
	}
	$('#nav-titles').html(out);


	out = '';
	for (const k of Object.keys(STS.themes['light'])) {
			out += `<li><a class="dropdown-item" href="#" onclick="HLT_addtitle(this)">${k}</a></li>`;
	}
	$('#nav-titles-add').html(out);
}


function HDR_input() {
	clearTimeout(HDR_input.tmr);		HDR_input.tmr = setTimeout(async()=>{
		STS.header.text   = header_box.value;
		STS.header.enable = header_enable.checked;
		STS_edit('header');
	}, 500);
}

function HDR_update() {
	header_box.innerHTML  = STS.header.text;
	header_enable.checked = STS.header.enable;
}


async function EDT_add(el) {
	const k = el.innerText,   n = $('#editor_addname').val().trim(),   e = $('#editor_addenum').val();
	
	const a = e.length ? e.split(',').map(v => v.trim()) : undefined;
	
	STS.editor[k] = STS.editor[k] || { name:n,  enum:a,  value:'' };			await STS_edit('editor');
}

async function EDT_input(el) {
	if (typeof el === 'string') { STS.editor[el] = '';		await STS_edit('editor');		return; }
	
	el = el || event.target;		const val = el.value,   key = el.getAttribute('id'),   i = STS.editor[key];

	i.value = val;		clearTimeout(EDT_input.tmr);		EDT_input.tmr = setTimeout(STS_edit, 200);
}

async function EDT_update() {
	let out = '';

	for (const [k,i] of Object.entries(STS.editor)) {
		const val = (i.value || '').replace(/"/g, '&quot;');

		const sel = !Array.isArray(i.enum) ? '' :
			'\n<select class="form-select" onchange="var t = this.nextElementSibling; t.value=this.value; EDT_input(t);">\n' +
			'<option disabled selected value style="display:none;"> -- select an option -- </option><option>-- default --</option>\n' +
			i.enum.map(v => `<option ${v.toString() === val ? 'selected' : ''} >${v}</option>`).join('') + '\n</select>\n';

		out += `<li class="list-group-item d-flex flex-wrap align-items-center">
					<span class="flex-fill my-2 me-3">${i.name || k}</span>
					<div  class="flex-fill my-2 me-5 ${sel ? 'select-editable' : ''}" style="min-width:100px;max-width:190px;">${sel}
						<input type="text" class="form-control input-sm" id="${k}" value="${val}" onblur="EDT_input(this)" onkeyup="(event.keyCode===13&&EDT_input(this))" />
					</div>
					<button type="button" class="btn btn-primary btn-sm w-auto my-2" onclick="EDT_input('${k}');">Remove</button>
				</li>`;
	}
	$('#nav-editor').html(out);

	const add = $('#nav-editor-add');
	
	if (add[0].children.length === 0) {
		let out = '',   lst = await vscode_Eval().vscode.workspace.getConfiguration('editor');

		for (const [k,v] of Object.entries(lst).sort()) {
				out += `<li><a class="dropdown-item" href="#" onclick="EDT_add(this)">${k}</a></li>`;
				if (typeof v === 'object' && v != null) {
					for (const n of Object.keys(v).sort()) {
						out += `<li><a class="dropdown-item" href="#" onclick="EDT_add(this)">${k}.${n}</a></li>`;
					}
				}
		}
		
		add.html(out);
	}
}