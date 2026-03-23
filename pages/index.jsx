import { useState, useCallback, useRef } from "react";

// ── FONTS ────────────────────────────────────────────────────────────────────
const fontFaceCSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/fonts/OpenDyslexic-Regular.otf') format('opentype');
  font-weight: normal;
}
@font-face {
  font-family: 'OpenDyslexic';
  src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/fonts/OpenDyslexic-Bold.otf') format('opentype');
  font-weight: bold;
}
@keyframes spin    { to { transform: rotate(360deg); } }
@keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes slideUp { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
`;

// ── ROY G BIV PARTS OF SPEECH ─────────────────────────────────────────────────
const PARTS = {
  "Noun":         { light:"#C0392B", dark:"#E74C3C",  label:"Noun",         abbr:"n.",    rule:"Names a person, place, thing, or idea" },
  "Verb":         { light:"#BA4A00", dark:"#E67E22",  label:"Verb",         abbr:"v.",    rule:"Shows action or state of being" },
  "Adjective":    { light:"#9A7D0A", dark:"#F1C40F",  label:"Adjective",    abbr:"adj.",  rule:"Describes or modifies a noun or pronoun" },
  "Adverb":       { light:"#1D8348", dark:"#2ECC71",  label:"Adverb",       abbr:"adv.",  rule:"Modifies a verb, adjective, or other adverb" },
  "Pronoun":      { light:"#1A5276", dark:"#3498DB",  label:"Pronoun",      abbr:"pro.",  rule:"Takes the place of a noun" },
  "Preposition":  { light:"#1B3A8A", dark:"#7986CB",  label:"Preposition",  abbr:"prep.", rule:"Shows relationship between words" },
  "Conjunction":  { light:"#6A1B9A", dark:"#AB47BC",  label:"Conjunction",  abbr:"conj.", rule:"Joins words, phrases, or clauses" },
  "Article":      { light:"#00695C", dark:"#26A69A",  label:"Article/Det.", abbr:"art.",  rule:"Introduces a noun (a, an, the, this, these…)" },
  "Interjection": { light:"#880E4F", dark:"#EC407A",  label:"Interjection", abbr:"int.",  rule:"Expresses strong emotion (Oh! Wow! Hey!)" },
};
const PART_KEYS = Object.keys(PARTS);
const RB = ["#E74C3C","#E67E22","#F1C40F","#2ECC71","#3498DB","#7986CB","#AB47BC"];

// ── SAMPLES ───────────────────────────────────────────────────────────────────
const SAMPLES = [
  { title:"Simple Sentences",      text:"The big dog ran quickly. She is very happy today. Birds sing sweet songs." },
  { title:"Prepositional Phrases", text:"The cat sat on the warm mat. After the long rain, the children played outside in the muddy yard." },
  { title:"Compound & Complex",    text:"Oh, the sun set slowly, and the bright stars came out. The students who studied hard passed every test." },
];

// ── SYSTEM PROMPT ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a precise English grammar expert. Return ONLY valid JSON — no markdown, no code fences, no explanation.

Return a JSON object with exactly two keys:

"tokens": Array covering every character of the original text:
  Word:  {"type":"word","text":"dog","pos":"Noun"}
  Space: {"type":"space","text":" "}
  Newline: {"type":"space","text":"\\n"}
  Punct: {"type":"punct","text":"."}
  Valid pos: Noun, Verb, Adjective, Adverb, Pronoun, Preposition, Conjunction, Article, Interjection
  Every word token must have exactly one valid pos. Preserve all spacing/punctuation.

"sentences": Array of Reed-Kellogg structure objects, one per sentence:
{
  "text": "The big dog ran quickly.",
  "sentenceType": "S-V",
  "subject": {"word":"dog","modifiers":[{"word":"The","pos":"Article"},{"word":"big","pos":"Adjective"}]},
  "verb": {"word":"ran","helpers":[],"modifiers":[{"word":"quickly","pos":"Adverb"}]},
  "directObject": null,
  "indirectObject": null,
  "predicateComplement": null,
  "predicateComplementType": null,
  "prepPhrases": []
}
sentenceType: "S-V"|"S-V-DO"|"S-V-IO-DO"|"S-V-PN"|"S-V-PA"
predicateComplementType: "noun"|"adjective"|null
prepPhrases item: {"preposition":"on","object":"mat","objectModifiers":[{"word":"the","pos":"Article"}],"modifies":"verb"}
modifies: "subject"|"verb"|"object"`;

// ── REED-KELLOGG SVG ──────────────────────────────────────────────────────────
function ReedKelloggDiagram({ sentence, dark, font }) {
  if (!sentence?.subject) return (
    <div style={{ color: dark?"#4A6B8A":"#8AAAC0", fontSize:14, padding:24, textAlign:"center", fontStyle:"italic" }}>
      Diagram data unavailable for this sentence.
    </div>
  );

  const { subject, verb, directObject, indirectObject, predicateComplement, predicateComplementType, prepPhrases } = sentence;
  const lineColor = dark ? "#2E4F6A" : "#9AB5C8";
  const gc = (pos) => { const p=PARTS[pos]; return p?(dark?p.dark:p.light):(dark?"#E2EAF4":"#1A2535"); };

  const M=32, DW=26, CX=10.5, MS=90, SP=32, BL=130, MH=52, MSP=38, FO=-40, PH=76, FM=16, FM2=13, FT=11;
  const sw = t => Math.max(MS,(t?.length||0)*CX+SP);
  const vt = [...(verb?.helpers||[]),verb?.word].filter(Boolean).join(" ");

  const ss=sw(subject?.word), vs=sw(vt), hasC=!!(directObject?.word||predicateComplement?.word);
  const co=directObject||predicateComplement, cw=co?.word||"", cs=sw(cw);
  const sx=M+ss/2, d1=M+ss+DW/2, vx=d1+DW/2+vs/2, d2=d1+DW/2+vs+DW/2, cx=d2+DW/2+cs/2;
  const tw=hasC?M+ss+DW+vs+DW+cs+M:M+ss+DW+vs+M;

  const sm=(subject?.modifiers||[]).slice(0,4), vm=(verb?.modifiers||[]).slice(0,4), cm=(co?.modifiers||[]).slice(0,4);
  const mm=Math.max(sm.length,vm.length,cm.length), pl=(prepPhrases||[]).slice(0,3);
  const th=BL+35+mm*MH+pl.length*PH+20;

  const mods=(mods,cx2,k)=>{
    if(!mods?.length) return null;
    const n=mods.length, fc=cx2+FO, hs=(n-1)*MSP/2, sx2=fc-hs, ey=BL+MH-8;
    return mods.map((m,i)=>{ const ex=sx2+i*MSP, c=gc(m.pos); return (
      <g key={`${k}${i}`}>
        <line x1={cx2} y1={BL} x2={ex} y2={ey} stroke={lineColor} strokeWidth={1.5}/>
        <text x={ex} y={ey+17} textAnchor="middle" fill={c} fontWeight={700} fontFamily={font} fontSize={FM2}>{m.word}</text>
        <text x={ex} y={ey+30} textAnchor="middle" fill={c} fontFamily={font} fontSize={FT} opacity={0.65}>({PARTS[m.pos]?.abbr||""})</text>
      </g>); });
  };

  const pb=BL+mm*MH+22;
  const preps=pl.map((pp,i)=>{
    let ac=vx; if(pp.modifies==="subject") ac=sx; else if(pp.modifies==="object") ac=cx;
    const dy=pb+i*PH, dx=ac+32, dey=dy+44, hx=dx+88, pc=gc("Preposition"), oc=gc("Noun");
    return (<g key={`pp${i}`}>
      <line x1={ac} y1={dy-8} x2={ac} y2={dy+4} stroke={lineColor} strokeWidth={1.5}/>
      <line x1={ac} y1={dy+4} x2={dx} y2={dey} stroke={lineColor} strokeWidth={1.5}/>
      <line x1={dx} y1={dey} x2={hx} y2={dey} stroke={lineColor} strokeWidth={1.5}/>
      <text x={(ac+dx)/2-6} y={(dy+4+dey)/2+4} textAnchor="middle" fill={pc} fontWeight={700} fontFamily={font} fontSize={FM2}>{pp.preposition}</text>
      <text x={(dx+hx)/2} y={dey-8} textAnchor="middle" fill={oc} fontWeight={800} fontFamily={font} fontSize={FM-1}>{pp.object}</text>
      {(pp.objectModifiers||[]).map((m,j)=><text key={j} x={dx+14+j*26} y={dey+17} fill={gc(m.pos)} fontWeight={600} fontFamily={font} fontSize={FT}>{m.word}</text>)}
    </g>);
  });

  const compCol = predicateComplement ? (predicateComplementType==="adjective"?"Adjective":"Noun") : "Noun";
  const compAbbr = predicateComplement ? (predicateComplementType==="adjective"?"(adj.)":"(n.)") : "(n.)";

  return (
    <div style={{ overflowX:"auto" }}>
      <svg viewBox={`0 0 ${tw} ${th}`} style={{ display:"block", width:Math.min(tw,760), minWidth:280, margin:"0 auto" }} aria-label={`Reed-Kellogg diagram: ${sentence.text}`}>
        <line x1={M-10} y1={BL} x2={tw-M+10} y2={BL} stroke={lineColor} strokeWidth={2.5}/>
        <text x={sx} y={BL-13} textAnchor="middle" fill={gc("Noun")} fontWeight={900} fontFamily={font} fontSize={FM}>{subject.word}</text>
        {mods(sm,sx,"s")}
        <line x1={d1} y1={BL-44} x2={d1} y2={BL+16} stroke={lineColor} strokeWidth={2.5}/>
        <text x={vx} y={BL-13} textAnchor="middle" fill={gc("Verb")} fontWeight={900} fontFamily={font} fontSize={FM}>{vt}</text>
        {mods(vm,vx,"v")}
        {hasC&&(predicateComplement
          ?<line x1={d2-14} y1={BL-42} x2={d2+14} y2={BL+16} stroke={lineColor} strokeWidth={2.5}/>
          :<line x1={d2} y1={BL-44} x2={d2} y2={BL+16} stroke={lineColor} strokeWidth={2.5}/>)}
        {hasC&&<><text x={cx} y={BL-13} textAnchor="middle" fill={gc(compCol)} fontWeight={900} fontFamily={font} fontSize={FM}>{cw}</text>{mods(cm,cx,"c")}</>}
        {indirectObject?.word&&<g>
          <line x1={vx} y1={BL+10} x2={vx} y2={BL+36} stroke={lineColor} strokeWidth={1.5}/>
          <line x1={vx-55} y1={BL+36} x2={vx+55} y2={BL+36} stroke={lineColor} strokeWidth={1.5}/>
          <text x={vx} y={BL+56} textAnchor="middle" fill={gc("Noun")} fontWeight={800} fontFamily={font} fontSize={FM-1}>{indirectObject.word}</text>
          <text x={vx} y={BL+70} textAnchor="middle" fill={gc("Noun")} fontFamily={font} fontSize={FT} opacity={0.6}>(indirect object)</text>
        </g>}
        {preps}
        <text x={sx} y={BL+16} textAnchor="middle" fill={gc("Noun")} fontFamily={font} fontSize={FT} opacity={0.6}>(n.)</text>
        <text x={vx} y={BL+16} textAnchor="middle" fill={gc("Verb")} fontFamily={font} fontSize={FT} opacity={0.6}>(v.)</text>
        {hasC&&<text x={cx} y={BL+16} textAnchor="middle" fill={gc(compCol)} fontFamily={font} fontSize={FT} opacity={0.6}>{compAbbr}</text>}
      </svg>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [inputText, setInputText]     = useState("");
  const [tokens, setTokens]           = useState(null);
  const [sentences, setSentences]     = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [fontSize, setFontSize]       = useState(30);
  const [dark, setDark]               = useState(true);
  const [dyslexic, setDyslexic]       = useState(false);
  const [showLabels, setShowLabels]   = useState(false);
  const [focusPart, setFocusPart]     = useState(null);
  const [library, setLibrary]         = useState(SAMPLES);
  const [saveName, setSaveName]       = useState("");
  const [activeTab, setActiveTab]     = useState("coder");
  const [showSaveBar, setShowSaveBar] = useState(false);
  const [diagIdx, setDiagIdx]         = useState(0);
  const [fullscreen, setFullscreen]   = useState(false);

  const outputRef = useRef(null);

  const D = {
    pageBg:   dark?"#0D1520":"#F0F4F8",
    panelBg:  dark?"#172030":"#FFFFFF",
    sideBg:   dark?"#111925":"#F8FAFC",
    border:   dark?"#263345":"#DDE3EA",
    headerBg: dark?"#0A1628":"#1A3E6B",
    legendBg: dark?"#111925":"#EEF1F5",
    text:     dark?"#E2EAF4":"#1A2535",
    subText:  dark?"#7A95B0":"#5A7080",
    inputBg:  dark?"#0D1520":"#FFFFFF",
    inputBdr: dark?"#263345":"#C8D4E0",
    tabActive:dark?"#172030":"#FFFFFF",
    tabBg:    dark?"#0D1520":"#E8EDF4",
    accent:   dark?"#7986CB":"#3949AB",
    punctText:dark?"#A0B4C8":"#444444",
    dimText:  dark?"#1E2F42":"#D0DCE8",
    editorBg: dark?"#0A1628":"#1A3E6B",
  };
  const font = dyslexic?"'OpenDyslexic',sans-serif":"'Nunito',system-ui,sans-serif";

  const cyclePOS = (ti, e) => {
    e.stopPropagation();
    setTokens(prev=>prev.map((t,i)=>{
      if(i!==ti||t.type!=="word") return t;
      const n=(PART_KEYS.indexOf(t.pos)+1)%PART_KEYS.length;
      return {...t,pos:PART_KEYS[n]};
    }));
  };

  const processText = useCallback(async()=>{
    if(!inputText.trim()) return;
    setLoading(true); setError(null); setTokens(null); setSentences(null); setShowSaveBar(false);
    try {
      const res  = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:SYSTEM_PROMPT,
          messages:[{role:"user",content:`Analyze this text:\n\n${inputText}`}]})});
      const data = await res.json();
      const raw  = data.content?.find(b=>b.type==="text")?.text||"";
      const parsed=JSON.parse(raw.replace(/```json|```/gi,"").trim());
      if(Array.isArray(parsed)){setTokens(parsed);setSentences([]);}
      else{setTokens(parsed.tokens||[]);setSentences(parsed.sentences||[]);}
      setShowSaveBar(true); setDiagIdx(0);
    } catch(e){setError("Something went wrong — try again.");console.error(e);}
    finally{setLoading(false);}
  },[inputText]);

  const downloadPDF = useCallback(()=>{
    if(!tokens) return;
    const pw=window.open("","_blank");
    const tokenHTML=tokens.map(t=>{
      if(t.type==="space") return t.text==="\n"?"<br/>":" ";
      if(t.type==="punct") return `<span style="color:#444">${t.text}</span>`;
      if(t.type==="word"&&t.pos){
        const p=PARTS[t.pos]||PARTS["Noun"], c=dark?p.dark:p.light;
        const dim=focusPart&&t.pos!==focusPart;
        return `<span style="color:${dim?"#ccc":c};font-weight:700;border-bottom:3px solid ${dim?"#ccc":c};padding-bottom:1px">${t.text}</span>`;
      }
      return t.text||"";
    }).join("");
    const legendHTML=Object.entries(PARTS).map(([,p])=>{
      const c=dark?p.dark:p.light;
      return `<span style="display:inline-flex;align-items:center;gap:5px;margin:3px 5px;padding:3px 9px;border:2px solid ${c};border-radius:6px"><span style="width:11px;height:11px;border-radius:3px;background:${c};display:inline-block"></span><span style="font-size:12px;font-weight:700;color:${c}">${p.label}</span></span>`;
    }).join("");
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rainbow Grammar Output</title>
<style>body{margin:.5in;font-family:sans-serif;background:white;color:#222}.legend{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:18px;padding:10px;border-radius:8px;background:#F0F2F5}.output{font-size:${fontSize}px;line-height:1.9}h2{color:#3949AB;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px}.brand{color:#888;font-size:11px;margin-bottom:16px}</style></head><body>
<div class="brand">rainbowgrammar.com · Sister site: colorsyllables.com</div>
<h2>Parts of Speech Key</h2><div class="legend">${legendHTML}</div>
<h2>Color-Coded Passage</h2><div class="output">${tokenHTML}</div>
<script>window.onload=()=>window.print()<\/script></body></html>`);
    pw.document.close();
  },[tokens,dark,fontSize,focusPart]);

  const stats=tokens?(()=>{
    const c=Object.fromEntries(PART_KEYS.map(k=>[k,0]));let t=0;
    tokens.forEach(tk=>{if(tk.type==="word"&&c[tk.pos]!==undefined){c[tk.pos]++;t++;}});
    return{counts:c,total:t};
  })():null;

  const saveToLibrary=()=>{
    if(!saveName.trim()||!inputText.trim()) return;
    setLibrary(prev=>[{title:saveName.trim(),text:inputText.trim()},...prev]);
    setSaveName(""); setShowSaveBar(false);
  };

  const btn=(active,color)=>({background:active?color:"transparent",border:`2px solid ${color}`,color:active?"white":color,borderRadius:8,padding:"5px 13px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s"});
  const tabSty=(id)=>({padding:"9px 20px",fontSize:14,fontWeight:700,cursor:"pointer",background:activeTab===id?D.tabActive:D.tabBg,color:activeTab===id?D.accent:D.subText,border:"none",borderBottom:activeTab===id?`3px solid ${D.accent}`:"3px solid transparent",transition:"all 0.2s",fontFamily:font});
  const rbTitle=t=>t.split("").map((ch,i)=><span key={i} style={{color:ch===" "?"inherit":RB[i%RB.length]}}>{ch}</span>);

  const renderToken=(token,ti)=>{
    if(token.type==="space") return <span key={ti}>{token.text==="\n"?<br/>:" "}</span>;
    if(token.type==="punct") return <span key={ti} style={{color:D.punctText}}>{token.text}</span>;
    if(token.type==="word"&&token.pos){
      const p=PARTS[token.pos]||PARTS["Noun"], c=dark?p.dark:p.light, dim=focusPart&&token.pos!==focusPart;
      return(
        <span key={ti} style={{display:"inline-flex",flexDirection:"column",alignItems:"center",verticalAlign:"bottom"}}>
          <span role="button" tabIndex={0} title={`${token.pos}: ${p.rule} — click to cycle`}
            aria-label={`${token.text}: ${token.pos}. Click to change.`}
            onClick={e=>cyclePOS(ti,e)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")cyclePOS(ti,e);}}
            style={{color:dim?D.dimText:c,fontWeight:800,borderBottom:`3px solid ${dim?D.dimText:c}`,paddingBottom:1,cursor:"pointer",transition:"color 0.15s,border-color 0.15s",userSelect:"none",lineHeight:1.5}}>
            {token.text}
          </span>
          {showLabels&&<span style={{fontSize:Math.max(9,fontSize*0.36),color:dim?D.dimText:c,fontWeight:700,lineHeight:1,marginTop:2,opacity:dim?0.2:0.72}}>{p.abbr}</span>}
        </span>
      );
    }
    return <span key={ti} style={{color:D.punctText}}>{token.text||""}</span>;
  };

  return(
    <div style={{minHeight:"100vh",background:D.pageBg,fontFamily:font,color:D.text,transition:"all 0.3s"}}>
      <style>{fontFaceCSS}</style>

      <div style={{background:D.headerBg,boxShadow:"0 3px 20px rgba(0,0,0,0.3)"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{padding:"14px 0"}}>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.5px"}}>🌈 {rbTitle("Rainbow Grammar")}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginTop:1}}>
              Parts of Speech · Reed-Kellogg Diagrams ·{" "}
              <a href="https://colorsyllables.com" target="_blank" rel="noopener noreferrer" style={{color:"rgba(255,255,255,0.45)",textDecoration:"underline"}}>Sister site: colorsyllables.com</a>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <button onClick={()=>setDyslexic(v=>!v)} aria-pressed={dyslexic}
              aria-label={dyslexic?"OpenDyslexic active, click to turn off":"Enable OpenDyslexic font"}
              style={{background:dyslexic?"rgba(46,204,113,0.3)":"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.3)",color:"white",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:font}}>
              {dyslexic?"✓ ":""}OpenDyslexic Font
            </button>
            <button onClick={()=>setDark(v=>!v)} aria-label={dark?"Switch to light mode":"Switch to dark mode"}
              style={{background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.3)",color:"white",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {dark?"☀️ Light":"🌙 Dark"}
            </button>
            <button onClick={()=>setFullscreen(v=>!v)} aria-label={fullscreen?"Exit fullscreen":"Enter fullscreen"}
              style={{background:"rgba(255,255,255,0.12)",border:"1.5px solid rgba(255,255,255,0.3)",color:"white",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
              {fullscreen?"⊠ Exit Full":"⛶ Fullscreen"}
            </button>
          </div>
        </div>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",paddingLeft:20}} role="tablist" aria-label="Main navigation">
          {[["coder","⚡ Color Coder"],["diagram","📐 Diagram"],["library","📚 Passage Library"],["about","ℹ️ About"]].map(([id,label])=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={tabSty(id)} role="tab" aria-selected={activeTab===id} aria-controls={`panel-${id}`}>{label}</button>
          ))}
        </div>
      </div>

      {activeTab==="about"&&(
        <div id="panel-about" role="tabpanel" style={{maxWidth:760,margin:"40px auto",padding:"0 24px 40px",animation:"fadeIn 0.3s ease"}}>
          <div style={{background:D.panelBg,borderRadius:16,padding:"36px 40px",border:`1px solid ${D.border}`}}>
            <h1 style={{fontSize:28,fontWeight:900,color:D.accent,marginBottom:8}}>Grammar Through Color</h1>
            <p style={{fontSize:16,lineHeight:1.8,color:D.subText,marginBottom:28}}>
              Rainbow Grammar makes the invisible architecture of English sentences <strong style={{color:D.text}}>visible</strong>. Color-coded parts of speech and Reed-Kellogg diagrams give students a concrete, visual path into understanding how words work together.
            </p>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:800,color:D.subText,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>The ROY G BIV Color Key</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {Object.entries(PARTS).map(([key,p])=>{const c=dark?p.dark:p.light;return(
                  <div key={key} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 14px",border:`2px solid ${c}`,borderRadius:8,background:`${c}18`}}>
                    <span style={{width:12,height:12,borderRadius:3,background:c,flexShrink:0}}/>
                    <span style={{fontSize:14,fontWeight:800,color:c,minWidth:112}}>{p.label}</span>
                    <span style={{fontSize:13,color:D.subText}}>{p.rule}</span>
                  </div>
                );})}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
              {[
                ["Reed-Kellogg Diagrams","Developed in the 1870s and used in American schools for over a century. Diagrams make grammatical relationships visible — which words modify which, how subjects and predicates connect, and where phrases attach."],
                ["Visual Grammar","Color-coded text activates visual memory pathways. Research on dual coding shows that visual-verbal pairing strengthens retention — seeing grammar in color makes abstract patterns concrete."],
                ["How to Use","Paste any English text and hit Analyze Grammar. Click any word to cycle its part of speech. Toggle Labels for an annotated study-guide view. Visit the Diagram tab for Reed-Kellogg diagrams sentence by sentence."],
                ["Sister to Color Syllables","Rainbow Grammar uses the same approach as colorsyllables.com — making abstract linguistic concepts visible through color, supporting all learners including those with dyslexia."],
              ].map(([t,d])=>(
                <div key={t} style={{background:D.sideBg,borderRadius:10,padding:"16px 18px",border:`1px solid ${D.border}`}}>
                  <div style={{fontSize:14,fontWeight:800,color:D.accent,marginBottom:6}}>{t}</div>
                  <div style={{fontSize:13,lineHeight:1.7,color:D.subText}}>{d}</div>
                </div>
              ))}
            </div>
            <div style={{background:D.sideBg,borderRadius:10,padding:"16px 20px",border:`1px solid ${D.border}`,marginBottom:24}}>
              <div style={{fontSize:13,fontWeight:800,color:D.subText,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Sentence Pattern Types</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {[["S-V","Subject + Verb","#E67E22"],["S-V-DO","+ Direct Object","#E74C3C"],["S-V-IO-DO","+ Indirect + Direct","#F1C40F"],["S-V-PN","+ Predicate Noun","#3498DB"],["S-V-PA","+ Predicate Adjective","#2ECC71"]].map(([code,desc,col])=>(
                  <div key={code} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",border:`2px solid ${col}`,borderRadius:7,background:`${col}18`}}>
                    <span style={{fontSize:12,fontWeight:800,color:col}}>{code}</span>
                    <span style={{fontSize:12,color:D.subText}}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:D.sideBg,borderRadius:10,padding:"16px 20px",border:`1px solid ${D.border}`}}>
              <div style={{fontSize:13,fontWeight:800,color:D.subText,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Accessibility</div>
              <div style={{fontSize:13,lineHeight:1.7,color:D.subText}}>
                An <strong style={{color:D.text}}>OpenDyslexic font toggle</strong> supports readers who benefit from a dyslexia-friendly typeface. A <strong style={{color:D.text}}>font size slider</strong> supports projector and low-vision use. <strong style={{color:D.text}}>Dark mode</strong> reduces visual glare. <strong style={{color:D.text}}>Fullscreen mode</strong> gives teachers a distraction-free display. All interactive elements include <strong style={{color:D.text}}>ARIA labels</strong>.
              </div>
            </div>
            <div style={{marginTop:24,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
              <div style={{fontSize:12,color:D.subText,opacity:0.7}}>© 2025 Joel Black. All rights reserved.</div>
              <a href="https://buymeacoffee.com/YOURLINK" target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",alignItems:"center",gap:8,background:"#FFDD00",color:"#000",borderRadius:10,padding:"11px 28px",fontSize:15,fontWeight:800,textDecoration:"none",boxShadow:"0 3px 12px rgba(0,0,0,0.15)",transition:"transform 0.15s,box-shadow 0.15s"}}
                onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 18px rgba(0,0,0,0.2)";}}
                onMouseOut={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 3px 12px rgba(0,0,0,0.15)";}}>
                ☕ Buy me a coffee
              </a>
            </div>
          </div>
        </div>
      )}

      {activeTab==="library"&&(
        <div id="panel-library" role="tabpanel" style={{maxWidth:900,margin:"32px auto",padding:"0 20px",animation:"fadeIn 0.3s ease"}}>
          <div style={{fontSize:13,fontWeight:700,color:D.subText,textTransform:"uppercase",letterSpacing:1.5,marginBottom:16}}>Saved Passages</div>
          <div style={{display:"grid",gap:12}}>
            {library.map((item,i)=>(
              <div key={i} style={{background:D.panelBg,border:`1px solid ${D.border}`,borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:D.text,marginBottom:4}}>{item.title}</div>
                  <div style={{fontSize:13,color:D.subText,lineHeight:1.5}}>{item.text.slice(0,120)}{item.text.length>120?"…":""}</div>
                </div>
                <button onClick={()=>{setInputText(item.text);setActiveTab("coder");setTokens(null);setSentences(null);}}
                  aria-label={`Load passage: ${item.title}`}
                  style={{background:D.accent,border:"none",color:"white",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
                  Load & Analyze →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab==="diagram"&&(
        <div id="panel-diagram" role="tabpanel" style={{maxWidth:920,margin:"32px auto",padding:"0 20px 40px",animation:"fadeIn 0.3s ease"}}>
          {(!sentences||sentences.length===0)?(
            <div style={{background:D.panelBg,border:`1px solid ${D.border}`,borderRadius:16,padding:52,textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:14}}>📐</div>
              <div style={{fontSize:17,fontWeight:700,color:D.subText,marginBottom:8}}>No diagrams yet</div>
              <div style={{fontSize:14,color:D.subText,opacity:0.7,marginBottom:22}}>Analyze a passage in the Color Coder tab first, then come back here.</div>
              <button onClick={()=>setActiveTab("coder")} style={{background:D.accent,border:"none",color:"white",borderRadius:9,padding:"10px 28px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Go to Color Coder →</button>
            </div>
          ):(
            <>
              {sentences.length>1&&(
                <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}} role="group" aria-label="Select sentence">
                  {sentences.map((_,i)=><button key={i} onClick={()=>setDiagIdx(i)} aria-pressed={diagIdx===i} style={{...btn(diagIdx===i,D.accent),fontSize:12}}>Sentence {i+1}</button>)}
                </div>
              )}
              <div style={{background:D.panelBg,border:`1px solid ${D.border}`,borderRadius:16,padding:"28px 24px",marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:800,color:D.subText,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Reed-Kellogg Diagram</div>
                <div style={{fontSize:16,color:D.text,fontWeight:600,marginBottom:24,padding:"10px 14px",borderLeft:`4px solid ${D.accent}`,background:D.sideBg,borderRadius:"0 8px 8px 0"}}>{sentences[diagIdx]?.text}</div>
                <ReedKelloggDiagram sentence={sentences[diagIdx]} dark={dark} font={font}/>
                <div style={{marginTop:20,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:11,color:D.subText,textTransform:"uppercase",letterSpacing:1,fontWeight:700}}>Pattern:</span>
                  <span style={{background:D.accent,color:"white",borderRadius:6,padding:"3px 12px",fontSize:12,fontWeight:700}}>{sentences[diagIdx]?.sentenceType||"S-V"}</span>
                </div>
              </div>
              <div style={{background:D.legendBg,border:`1px solid ${D.border}`,borderRadius:12,padding:"14px 20px"}}>
                <div style={{fontSize:11,fontWeight:800,color:D.subText,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Diagram Key</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,fontSize:13,color:D.subText,lineHeight:1.5,marginBottom:12}}>
                  <div><strong style={{color:D.text}}>│ Vertical line</strong> — subject from predicate; verb from direct object</div>
                  <div><strong style={{color:D.text}}>╱ Diagonal slash</strong> — verb from predicate nominative or adjective</div>
                  <div><strong style={{color:D.text}}>﹨ Modifier lines</strong> — adjectives, articles, adverbs hang below their head word</div>
                  <div><strong style={{color:D.text}}>↙ Angled connector</strong> — prepositional phrase attached below its head word</div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {Object.entries(PARTS).map(([key,p])=>{const c=dark?p.dark:p.light;return(
                    <span key={key} style={{display:"inline-flex",alignItems:"center",gap:5,border:`1.5px solid ${c}`,borderRadius:6,padding:"3px 9px",background:`${c}18`}}>
                      <span style={{width:9,height:9,borderRadius:2,background:c,display:"inline-block"}}/>
                      <span style={{fontSize:12,fontWeight:700,color:c}}>{p.abbr}</span>
                      <span style={{fontSize:12,color:D.subText}}>{p.label}</span>
                    </span>
                  );})}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab==="coder"&&(
        <div id="panel-coder" role="tabpanel" style={{display:"flex",flex:1,flexWrap:"wrap",maxHeight:"calc(100vh - 130px)"}}>
          <div style={{width:tokens?"260px":"100%",minWidth:220,background:D.sideBg,borderRight:`2px solid ${D.border}`,display:"flex",flexDirection:"column",padding:16,gap:10,overflowY:"auto"}}>
            <label htmlFor="grammar-input" style={{fontSize:11,fontWeight:700,color:D.subText,textTransform:"uppercase",letterSpacing:1.5}}>Your Text</label>
            <textarea id="grammar-input" value={inputText} onChange={e=>setInputText(e.target.value)}
              placeholder={"Morning message, story, paragraph,\nstudent writing — paste anything."}
              aria-label="Paste your text here"
              style={{flex:1,minHeight:tokens?200:180,border:`2px solid ${D.inputBdr}`,borderRadius:9,padding:12,fontSize:14,lineHeight:1.6,resize:"vertical",outline:"none",fontFamily:font,color:D.text,background:D.inputBg}}/>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:D.subText,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Try a sample</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {SAMPLES.map((s,i)=>(
                  <button key={i} onClick={()=>{setInputText(s.text);setTokens(null);setSentences(null);}}
                    aria-label={`Load sample: ${s.title}`}
                    style={{background:"none",border:`1px solid ${D.border}`,borderRadius:6,padding:"5px 10px",fontSize:12,color:D.subText,cursor:"pointer",textAlign:"left",fontFamily:font}}>
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={processText} disabled={loading||!inputText.trim()}
              aria-label="Analyze and color-code the grammar" aria-busy={loading}
              style={{background:loading||!inputText.trim()?(dark?"#1A2A3A":"#C8D4E0"):"linear-gradient(135deg,#3949AB,#5C6BC0)",color:"white",border:"none",borderRadius:9,padding:"11px 0",fontSize:15,fontWeight:800,cursor:loading||!inputText.trim()?"not-allowed":"pointer",fontFamily:font}}>
              {loading?"Analyzing…":"🌈 Analyze Grammar"}
            </button>
            {error&&<div role="alert" style={{background:dark?"#2D1515":"#FDEDEC",border:"1.5px solid #E74C3C",borderRadius:7,padding:"8px 12px",fontSize:13,color:dark?"#F1948A":"#922B21"}}>{error}</div>}
            {showSaveBar&&(
              <div style={{display:"flex",gap:6,animation:"fadeIn 0.3s ease"}}>
                <input value={saveName} onChange={e=>setSaveName(e.target.value)}
                  placeholder="Name this passage…" aria-label="Name this passage to save to library"
                  style={{flex:1,border:`1.5px solid ${D.inputBdr}`,borderRadius:7,padding:"6px 10px",fontSize:13,color:D.text,background:D.inputBg,fontFamily:font,outline:"none"}}/>
                <button onClick={saveToLibrary} disabled={!saveName.trim()} aria-label="Save to library"
                  style={{background:D.accent,border:"none",color:"white",borderRadius:7,padding:"6px 10px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button>
              </div>
            )}
            {tokens&&(
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setTokens(null);setSentences(null);setShowSaveBar(false);setFocusPart(null);}}
                  aria-label="Analyze a new passage"
                  style={{flex:1,background:"none",border:`1.5px solid ${D.accent}`,borderRadius:7,padding:"7px 0",fontSize:13,color:D.accent,cursor:"pointer",fontWeight:700,fontFamily:font}}>
                  ↺ New Passage
                </button>
                <button onClick={()=>{setTokens(null);setSentences(null);setInputText("");setShowSaveBar(false);setFocusPart(null);}}
                  aria-label="Clear everything"
                  style={{flex:1,background:"none",border:`1.5px solid ${D.border}`,borderRadius:7,padding:"7px 0",fontSize:13,color:D.subText,cursor:"pointer",fontWeight:600,fontFamily:font}}>
                  ✕ Clear All
                </button>
              </div>
            )}
          </div>

          {tokens&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",animation:"fadeIn 0.4s ease"}}>
              <div style={{background:D.legendBg,borderBottom:`2px solid ${D.border}`,padding:"10px 18px",display:"flex",flexWrap:"wrap",gap:8,alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}} role="group" aria-label="Focus filter">
                  <span style={{fontSize:11,fontWeight:700,color:D.subText,textTransform:"uppercase",letterSpacing:1,marginRight:4}}>Focus:</span>
                  <button onClick={()=>setFocusPart(null)} aria-pressed={!focusPart} style={{...btn(!focusPart,D.accent),fontSize:12,padding:"3px 10px"}}>All</button>
                  {Object.entries(PARTS).map(([key,p])=>{
                    const c=dark?p.dark:p.light, active=focusPart===key;
                    return(<button key={key} onClick={()=>setFocusPart(active?null:key)} aria-pressed={active} aria-label={`Focus on ${key}s`}
                      style={{background:active?c:"transparent",border:`2px solid ${c}`,color:active?"white":c,borderRadius:7,padding:"3px 10px",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}}>
                      {p.label}
                    </button>);
                  })}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={()=>setShowLabels(v=>!v)} aria-pressed={showLabels} style={{...btn(showLabels,D.accent),fontSize:12,padding:"3px 10px"}}>
                    {showLabels?"✓ Labels":"Labels"}
                  </button>
                  <button onClick={()=>setActiveTab("diagram")}
                    style={{background:D.accent,border:"none",color:"white",borderRadius:8,padding:"5px 13px",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                    📐 Diagram →
                  </button>
                  <label htmlFor="font-size-range" style={{fontSize:11,fontWeight:700,color:D.subText}}>Size</label>
                  <input id="font-size-range" type="range" min={18} max={72} value={fontSize}
                    onChange={e=>setFontSize(Number(e.target.value))}
                    aria-label={`Font size: ${fontSize}px`} style={{width:80,accentColor:D.accent}}/>
                  <span style={{fontSize:12,fontWeight:700,color:D.subText,minWidth:28}} aria-live="polite">{fontSize}px</span>
                  <button onClick={downloadPDF} aria-label="Download as PDF"
                    style={{background:D.accent,border:"none",color:"white",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:800,cursor:"pointer"}}>
                    ⬇ PDF
                  </button>
                </div>
              </div>
              <div ref={outputRef}
                style={{flex:fullscreen?undefined:1,padding:fullscreen?"40px 60px":"28px 36px",overflowY:"auto",background:D.panelBg,
                  ...(fullscreen?{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:9999}:{})}}>
                <div style={{fontSize:11,fontWeight:600,color:D.subText,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{textTransform:"uppercase",letterSpacing:1.5,fontWeight:700}}>Color-Coded Output</span>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <span style={{opacity:0.7}}>💡 Click any word to cycle its part of speech</span>
                    {fullscreen&&<button onClick={()=>setFullscreen(false)} aria-label="Exit fullscreen"
                      style={{background:D.accent,border:"none",color:"white",borderRadius:8,padding:"5px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>⊠ Exit Fullscreen</button>}
                  </div>
                </div>
                <div style={{fontSize:fontSize,lineHeight:showLabels?2.7:1.9,fontFamily:font}}
                  role="region" aria-label="Color-coded grammar output" aria-live="polite">
                  {tokens.map(renderToken)}
                </div>
              </div>
              {stats&&stats.total>0&&(
                <div style={{background:D.sideBg,borderTop:`2px solid ${D.border}`,padding:"14px 24px"}}
                  role="region" aria-label="Part of speech statistics">
                  <div style={{fontSize:11,fontWeight:700,color:D.subText,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Passage Analysis — {stats.total} words</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {Object.entries(PARTS).map(([key,p])=>{
                      const count=stats.counts[key]||0, pct=stats.total?Math.round(count/stats.total*100):0;
                      const c=dark?p.dark:p.light;
                      if(!count) return null;
                      return(
                        <div key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{width:100,fontSize:12,fontWeight:700,color:c,flexShrink:0}}>{p.label}</div>
                          <div style={{flex:1,height:14,background:dark?"#1A2A3A":"#E8EDF4",borderRadius:7,overflow:"hidden"}}
                            role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.label}: ${count} words, ${pct}%`}>
                            <div style={{width:`${pct}%`,height:"100%",background:c,borderRadius:7,transition:"width 0.5s ease"}}/>
                          </div>
                          <div style={{width:58,fontSize:12,fontWeight:700,color:D.subText,textAlign:"right",flexShrink:0}}>{count} ({pct}%)</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!tokens&&!loading&&(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:D.subText,fontSize:17,fontWeight:600,padding:40,textAlign:"center",flexDirection:"column",gap:12}}>
              <div style={{fontSize:56}}>🌈</div>
              <div>Paste your text and hit Analyze Grammar</div>
              <div style={{fontSize:13,opacity:0.7}}>or load a sample from the sidebar</div>
            </div>
          )}

          {loading&&(
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}
              role="status" aria-live="polite" aria-label="Analyzing grammar, please wait">
              <div style={{width:46,height:46,border:`5px solid ${D.border}`,borderTop:`5px solid ${D.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}} aria-hidden="true"/>
              <div style={{fontSize:15,fontWeight:700,color:D.accent}}>Analyzing grammar…</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
