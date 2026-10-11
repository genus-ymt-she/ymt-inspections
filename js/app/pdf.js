"use strict";
/* ---------- PDF ---------- */
const PDFSAFE=s=>String(s??"").replace(/₆/g,"6").replace(/₂/g,"2").replace(/⚠/g,"!").replace(/≥/g,">=").replace(/≤/g,"<=").replace(/→/g,"->").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/•/g,"-").replace(/[^\x00-\xFF–—…×÷²³¼½¾€]/g,"");
function hex(c){return [parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
async function buildPDF(d){if(PDFBLOB)return PDFBLOB;if(tabByNum(d.tab).kind==="record")return buildRecordPDF(d);const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});
  const t=tabByNum(d.tab);const s=stats(d);const D=d.details;const W=210,M=12;const NAVY=hex("#112B4E"),ORG=hex("#EC7723"),GREY=hex("#F2F4F7");
  const docId=`${CONFIG.docPrefix}-${pad(t.num)}`;
  // header
  const lp=doc.getImageProperties(LOGO);const lh=11,lw=lp.width*lh/lp.height;doc.addImage(LOGO,"PNG",M,10,lw,lh);
  doc.setFont("helvetica","bold");doc.setFontSize(8);doc.setTextColor(...ORG);doc.text("SITE INSPECTION REPORT",W-M,12,{align:"right"});
  doc.setFontSize(13);doc.setTextColor(...NAVY);doc.text(PDFSAFE(t.title),W-M,18,{align:"right"});
  doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.setTextColor(90);doc.text(`${docId}  |  Rev ${CONFIG.rev}  |  Report ID ${reportId(d)}`,W-M,22.5,{align:"right"});
  doc.setFillColor(...NAVY);doc.rect(M,25,W-2*M,6.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.text(PDFSAFE(CONFIG.project),M+2,29.3);
  let y=34;
  const hide=t.hideStd||[];let det;
  if(t.fixed){det=[];for(let i=0;i<t.fixed.length;i+=2)det.push([t.fixed[i][0],t.fixed[i][1],t.fixed[i+1]?t.fixed[i+1][0]:"",t.fixed[i+1]?t.fixed[i+1][1]:""]);
    det.push(["Date & time",fmtDT(D.datetime),"Inspector",D.inspector])}
  else det=[["Inspection location / work front",D.location,"Date & time",fmtDT(D.datetime)],["Contractor / crew",D.crew,"Inspector",D.inspector],["Supervisor / person in charge",D.supervisor,"",""]];
  const ex=Object.entries(D.extra||{}).map(([k,v])=>[k,(t.extraTypes||{})[k]==="date"?fmtD(v):v]);for(let i=0;i<ex.length;i+=2){det.push([ex[i][0].replace(/:$/,""),ex[i][1],ex[i+1]?ex[i+1][0].replace(/:$/,""):"",ex[i+1]?ex[i+1][1]:""])}
  doc.autoTable({startY:y,margin:{left:M,right:M},body:det.map(r=>r.map(PDFSAFE)),theme:"grid",styles:{font:"helvetica",fontSize:8,cellPadding:1.6,lineColor:[200,206,214],lineWidth:.2,textColor:20},
    columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:38},1:{cellWidth:55},2:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:25}}});
  y=doc.lastAutoTable.finalY+3;
  if(t.checks){const C=t.checks;doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",head:[[{content:PDFSAFE(C.title),colSpan:3}],["Check",...C.cols.map(PDFSAFE)]],
      body:C.rows.map((r,ri)=>[PDFSAFE(r),...C.cols.map((_,ci)=>PDFSAFE(chkVal(d,ci,ri)||"-"))]),
      styles:{font:"helvetica",fontSize:8,cellPadding:1.6,lineColor:[200,206,214],lineWidth:.2,textColor:20},headStyles:{fillColor:NAVY,textColor:255,fontStyle:"bold"},
      columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:52}}});y=doc.lastAutoTable.finalY+3}
  if(t.log){const L=t.log;doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",
      head:[[{content:PDFSAFE(`${L.title}  |  ${L.ref}`),colSpan:3+L.cols.length}],["No.","Check","Ref",...L.cols]],
      body:L.rows.map((row,r)=>[row.no,PDFSAFE(row.label),PDFSAFE(row.ref),...L.cols.map((_,c)=>PDFSAFE((logVal(d,r,c)||"").split(" – ")[0]||""))]),
      styles:{font:"helvetica",fontSize:7.4,cellPadding:1.4,lineColor:[200,206,214],lineWidth:.2,textColor:20},headStyles:{fillColor:NAVY,textColor:255,fontStyle:"bold"},
      columnStyles:{0:{cellWidth:9,fontStyle:"bold"},1:{cellWidth:62},2:{cellWidth:24,fontSize:6.5,textColor:90}},
      didParseCell:c=>{if(c.section==="body"&&c.column.index>2){c.cell.styles.halign="center";const row=L.rows[c.row.index];if(row.warnIf&&c.cell.raw===row.warnIf){c.cell.styles.fillColor=hex("#C62828");c.cell.styles.textColor=255;c.cell.styles.fontStyle="bold"}}}});
    y=doc.lastAutoTable.finalY+3}
  if(t.refTable){const T=t.refTable;doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},theme:"grid",head:[[{content:PDFSAFE(T.title),colSpan:2}]],
      body:[...T.rows.map(r=>r.map(PDFSAFE)),...(T.foot?[[{content:PDFSAFE(T.foot),colSpan:2,styles:{fontSize:6.8,textColor:70}}]]:[])],
      styles:{font:"helvetica",fontSize:7.2,cellPadding:1.4,lineColor:[200,206,214],lineWidth:.2,textColor:20},headStyles:{fillColor:NAVY,textColor:255,fontStyle:"bold"},
      columnStyles:{0:{cellWidth:34,fontStyle:"bold",textColor:NAVY,fillColor:GREY}}});y=doc.lastAutoTable.finalY+3}
  if(t.note){doc.setFont("helvetica","normal");doc.setFontSize(7.5);const ln=doc.splitTextToSize(PDFSAFE(t.note),W-2*M-6);const bh=ln.length*3.3+4;
    doc.setFillColor(...hex("#FFF4E5"));doc.setDrawColor(...ORG);doc.roundedRect(M,y,W-2*M,bh,1.2,1.2,"FD");doc.setTextColor(...hex("#6B3A0A"));doc.text(ln,M+3,y+4.5);y+=bh+3}
  // score boxes
  const boxes=[["C",s.C,"#2E7D32"],["UA",s.UA,"#C62828"],["NI",s.NI,"#E39A00"],["N/A",s.NA,"#7A8594"],["Compliance",s.pct===null?"-":s.pct+"%","#112B4E"]];
  const bw=(W-2*M-4*3)/5;boxes.forEach((b,i)=>{const x=M+i*(bw+3);doc.setFillColor(...hex(b[2]));doc.roundedRect(x,y,bw,12,1.5,1.5,"F");doc.setTextColor(255);doc.setFont("helvetica","bold");doc.setFontSize(13);doc.text(String(b[1]),x+bw/2,y+6.5,{align:"center"});doc.setFontSize(7);doc.text(b[0],x+bw/2,y+10.3,{align:"center"})});
  y+=15;
  if(s.snnN){const names=[...new Set(s.ncs.flatMap(n=>snnNames(n.snn)))].join(" · ");doc.setFillColor(...ORG);doc.roundedRect(M,y,W-2*M,9,1.5,1.5,"F");doc.setTextColor(255);doc.setFontSize(8.5);doc.setFont("helvetica","bold");
    doc.text(PDFSAFE(`SAFETY NON-NEGOTIABLE NON-COMPLIANCE(S): ${s.snnN}  -  ${names}`),M+3,y+5.8,{maxWidth:W-2*M-6});y+=12}
  if(s.UA){doc.setFillColor(...hex("#FDECEC"));doc.setDrawColor(...hex("#C62828"));doc.roundedRect(M,y,W-2*M,7,1.2,1.2,"FD");doc.setTextColor(...hex("#7A1414"));doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text("UA recorded - task to be stopped, made safe and the Supervisor and SHE Manager notified immediately.",M+3,y+4.6);y+=10}
  // NC table
  const sectionTitle=(txt)=>{doc.setFont("helvetica","bold");doc.setFontSize(9);doc.setTextColor(...NAVY);doc.text(txt,M,y+4);doc.setDrawColor(...ORG);doc.setLineWidth(.6);doc.line(M,y+5.5,W-M,y+5.5);doc.setLineWidth(.2);y+=8};
  if(y>250){doc.addPage();y=16}
  sectionTitle(`NON-COMPLIANCES & CORRECTIVE ACTIONS (${s.ncs.length})`);
  const ICO=7.5,IG=1.2;
  if(s.ncs.length){doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},
     head:[["#","Rating","Risk","Item / finding","Proposed corrective action","Status","SNN"]],
     body:s.ncs.map(n=>{const k=riskOf(n.cons,n.like);return [n.id,n.r,k?`${k.level} ${k.score}\n${k.cl} /\n${k.ll}`:"-",PDFSAFE(`${n.text}\n\nFinding: ${n.finding}`),PDFSAFE(n.action),PDFSAFE(n.closed?`CLOSED at time of inspection\nAction taken: ${n.taken}`:`OPEN${n.owner?`\nResponsible: ${n.owner}`:""}${n.due?`\nDue: ${fmtD(n.due)}`:""}`),PDFSAFE(snnNames(n.snn).join("\n")||"-")]}),
     theme:"grid",styles:{font:"helvetica",fontSize:7.6,cellPadding:1.6,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"},
     headStyles:{fillColor:NAVY,textColor:255,fontStyle:"bold"},
     columnStyles:{0:{cellWidth:11,fontStyle:"bold"},1:{cellWidth:12,halign:"center",fontStyle:"bold"},2:{cellWidth:17,halign:"center",fontStyle:"bold",fontSize:7},3:{cellWidth:51},4:{cellWidth:37},5:{cellWidth:30},6:{cellWidth:28,halign:"center"}},
     didDrawCell:c=>{if(c.section!=="body"||c.column.index!==6)return;const codes=(s.ncs[c.row.index]||{}).snn||[];if(!codes.length)return;
       const tot=codes.length*ICO+(codes.length-1)*IG;let x=c.cell.x+(c.cell.width-tot)/2;
       codes.forEach(k=>{if(SNN_ICONS[k]){doc.addImage(SNN_ICONS[k],"PNG",x,c.cell.y+1.6,ICO,ICO)}x+=ICO+IG})},
     didParseCell:c=>{if(c.section==="body"&&c.column.index===6&&((s.ncs[c.row.index]||{}).snn||[]).length){c.cell.styles.cellPadding={top:1.6+ICO+1.2,bottom:1.6,left:1,right:1};c.cell.styles.fontSize=6.8}
       if(c.section==="body"&&c.column.index===1){c.cell.styles.textColor=255;c.cell.styles.fillColor=c.cell.raw==="UA"?hex("#C62828"):hex("#E39A00")}
       if(c.section==="body"&&c.column.index===2){const n=s.ncs[c.row.index];const k=n&&riskOf(n.cons,n.like);if(k){c.cell.styles.fillColor=hex(k.color);c.cell.styles.textColor=hex(k.ink)}}
       if(c.section==="body"&&c.column.index===6&&c.cell.raw!=="-"){c.cell.styles.textColor=ORG;c.cell.styles.fontStyle="bold"}
       if(c.section==="body"&&c.column.index===5){c.cell.styles.textColor=String(c.cell.raw).startsWith("CLOSED")?hex("#2E7D32"):hex("#C62828");c.cell.styles.fontStyle="bold"}}});
    y=doc.lastAutoTable.finalY+4;
    // photos
    const ph=s.ncs.flatMap(n=>n.photos.map(p=>({p,id:n.id})));
    if(ph.length){if(y>230){doc.addPage();y=16}sectionTitle(`PHOTOS (${ph.length})`);const pw=(W-2*M-2*4)/3;
      for(let i=0;i<ph.length;i++){const ip=doc.getImageProperties(ph[i].p);const phh=Math.min(pw*ip.height/ip.width,70);const col=i%3;
        if(col===0&&i>0)y+=rowH+6;if(col===0){var rowH=0}
        if(y+phh>280){doc.addPage();y=16}
        const x=M+col*(pw+4);const iw=phh*ip.width/ip.height;doc.addImage(ph[i].p,"JPEG",x,y,Math.min(iw,pw),phh);doc.setFontSize(7);doc.setTextColor(80);doc.text(`Item ${ph[i].id}`,x,y+phh+3.5);rowH=Math.max(rowH,phh)}
      y+=rowH+8}
  }else{doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.setTextColor(60);doc.text("No non-compliances identified.",M,y+3);y+=8}
  {const vp=visualPhotos(d);if(vp.length){if(y>230){doc.addPage();y=16}sectionTitle(`PHOTOS – VISUAL RECORD, COMPLIANT ITEMS (${vp.length})`);const pw=(W-2*M-2*4)/3;let rh=0;
    vp.forEach((it,i)=>{const ip=doc.getImageProperties(it.p);const phh=Math.min(pw*ip.height/ip.width,70);const col=i%3;if(col===0&&i>0){y+=rh+6;rh=0}if(col===0&&y+phh>280){doc.addPage();y=16}
      const x=M+col*(pw+4);const iw=phh*ip.width/ip.height;doc.addImage(it.p,"JPEG",x,y,Math.min(iw,pw),phh);doc.setFontSize(7);doc.setTextColor(80);doc.text(`Item ${it.id}`,x,y+phh+3.5);rh=Math.max(rh,phh)});y+=rh+8}}
  if(t.checks&&(t.checks.photos||[]).length){const C=t.checks;const list=[];C.cols.forEach((col,c)=>C.photos.forEach((_,k)=>{const ph=chkPhoto(d,c,k);if(ph)list.push({ph,cap:`${col} – ${(C.photoShort||[])[k]||""}`})}));
    if(list.length){if(y>200){doc.addPage();y=16}sectionTitle(`TRAFFIC MANAGEMENT PHOTOS – TIMESTAMPED (${list.length})`);const pw=(W-2*M-6)/2;let rowH=0;
      list.forEach((it,i)=>{const ip=doc.getImageProperties(it.ph.img);const ph=Math.min(pw*ip.height/ip.width,95);const iw=ph*ip.width/ip.height;const col=i%2;
        if(col===0&&i>0){y+=rowH+8;rowH=0}if(col===0&&y+ph>280){doc.addPage();y=16}
        const x=M+col*(pw+6);doc.addImage(it.ph.img,"JPEG",x,y,iw,ph);doc.setFont("helvetica","bold");doc.setFontSize(7.2);doc.setTextColor(...NAVY);
        doc.text(PDFSAFE(it.cap+(it.ph.old?"  (photo time differs from the check time – see stamp)":it.ph.unverified?"  (uploaded – original time not recorded)":"")),x,y+ph+3.6,{maxWidth:pw});rowH=Math.max(rowH,ph)});
      y+=rowH+9}}
  // full checklist
  if(y>240){doc.addPage();y=16}
  sectionTitle("FULL CHECKLIST");
  const body=[];t.sections.forEach(sec=>{body.push([{content:sec.name,colSpan:5,styles:{fillColor:hex("#FDECDE"),textColor:NAVY,fontStyle:"bold",fontSize:7.5}}]);
    sec.q.forEach(q=>{const a=d.answers[q.id]||{};let cm=(a.comment||"")+((a.r==="C"||a.r==="NA")&&(a.photos||[]).length?`${a.comment?" ":""}[${a.photos.length} photo(s)]`:"");if(a.r==="UA"||a.r==="NI")cm=`Finding: ${a.finding||""}`+(a.closed?" (closed)":" (open)");
      body.push([q.id,PDFSAFE(q.text)+((q.snn||[]).length?`\n[SNN: ${snnNames(q.snn).join(" / ")}]`:""),PDFSAFE(q.ref),RLABEL[a.r]||"",PDFSAFE(cm)])})});
  d.others.forEach((o,i)=>{if(i===0)body.push([{content:"OTHER HAZARDS IDENTIFIED",colSpan:5,styles:{fillColor:hex("#FDECDE"),textColor:NAVY,fontStyle:"bold",fontSize:7.5}}]);
    body.push([`X${i+1}`,PDFSAFE(o.title)+((o.snn||[]).length?`\n[SNN: ${snnNames(o.snn).join(" / ")}]`:""),"",o.r,PDFSAFE(`Finding: ${o.finding||""}`+(o.closed?" (closed)":" (open)"))])});
  doc.autoTable({startY:y,margin:{left:M,right:M,top:16,bottom:16},head:[["#","Inspection item","Plan ref","Result","Comment"]],body,theme:"grid",
    styles:{font:"helvetica",fontSize:7.2,cellPadding:1.4,lineColor:[200,206,214],lineWidth:.2,textColor:20,valign:"top"},headStyles:{fillColor:NAVY,textColor:255},
    columnStyles:{0:{cellWidth:10,fontStyle:"bold"},1:{cellWidth:98},2:{cellWidth:22,fontSize:6.5,textColor:90},3:{cellWidth:12,halign:"center",fontStyle:"bold"},4:{cellWidth:44}},
    didParseCell:c=>{if(c.section==="body"&&c.column.index===3){const m={C:"#2E7D32",UA:"#C62828",NI:"#E39A00","N/A":"#7A8594"}[c.cell.raw];if(m){c.cell.styles.fillColor=hex(m);c.cell.styles.textColor=255}}}});
  y=doc.lastAutoTable.finalY+5;
  if(t.image){const ip=doc.getImageProperties(t.image);const iw=W-2*M,ih=iw*ip.height/ip.width;if(y+ih+10>282){doc.addPage();y=16}
    sectionTitle(PDFSAFE((t.imageTitle||"Reference").toUpperCase()));doc.addImage(t.image,"JPEG",M,y,iw,ih);doc.setDrawColor(200,206,214);doc.rect(M,y,iw,ih);y+=ih+6}
  // sign-off
  if(y>222){doc.addPage();y=16}
  sectionTitle("SIGN-OFF");
  doc.autoTable({startY:y,margin:{left:M,right:M},theme:"grid",styles:{font:"helvetica",fontSize:8,cellPadding:2,lineColor:[200,206,214],lineWidth:.2,minCellHeight:9},
    columnStyles:{0:{fontStyle:"bold",fillColor:GREY,textColor:NAVY,cellWidth:55}},
    body:[["Inspected by",PDFSAFE(D.inspector)],["Signature",""],["Date & time",fmtDT(D.datetime)],["Entered in MYOSH – inspection ref No",""],["Hazards added to Hazard Register (SHE Manager)",""],...(t.signoffRows||[]).map(r=>[PDFSAFE(r)+" – name / signature / date",""])],
    didDrawCell:c=>{if(c.section==="body"&&c.row.index===1&&c.column.index===1&&d.signature){const h=Math.min(c.cell.height-2,14);try{doc.addImage(d.signature,"PNG",c.cell.x+2,c.cell.y+1,h*2.6,h)}catch(e){}}},
    didParseCell:c=>{if(c.section==="body"&&c.row.index===1)c.cell.styles.minCellHeight=16}});
  // footer
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(6.8);doc.setTextColor(110);
    doc.text(`${docId}  |  Rev ${CONFIG.rev}  |  ${reportId(d)}`,M,290);doc.text(`PARRON v${CONFIG.appVersion}  |  Uncontrolled when printed  |  Page ${i} of ${n}`,W-M,290,{align:"right"});
    if(i>1){doc.setFont("helvetica","bold");doc.setFontSize(7.5);doc.setTextColor(...NAVY);doc.text(PDFSAFE(`${t.title}  –  ${D.location}  –  ${fmtDT(D.datetime)}`),M,9)}}
  PDFBLOB=doc.output("blob");return PDFBLOB}
