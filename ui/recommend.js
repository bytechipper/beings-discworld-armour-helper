"use strict";
(function(root) {
  const parts = ['hair','head','eyes','face','neck','hands','arms','back','chest','abdomen','legs','feet'];
  function normalize(s) { return s.toLowerCase().replace(/\b(?:the|a|an|pair of)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
  function parse(lines, library) {
    const covered = {}, worn = new Set(), unknown = new Set();
    for (const raw of lines) {
      const line = raw.trim();
      const unprotected = line.match(/^Your (.+?) (?:is|are) unprotected\.$/);
      if (unprotected) {
        for (const part of parts) if (new RegExp('\\b'+part+'\\b').test(unprotected[1])) covered[part] = [];
        continue;
      }
      // "could be protected" describes unworn equipment; never count it as worn.
      const match = line.match(/^Your (.+?) (?:is|are) protected by (.+?)(?: and could be protected by .+)?\.$/);
      if (!match) continue;
      const body = parts.filter(p => new RegExp('\\b'+p+'\\b').test(match[1]));
      const description = normalize(match[2]);
      const found = library.filter(a => {
        const n = normalize(a.name);
        return description === n || (' '+description+' ').includes(' '+n+' ');
      }).sort((a,b) => normalize(b.name).length-normalize(a.name).length);
      // Avoid shorter catalogue names contained in a more specific match.
      const matched = found.filter((a,i) => !found.slice(0,i).some(b => normalize(b.name).includes(normalize(a.name))));
      matched.forEach(a => worn.add(a));
      const residual = matched.reduce((s,a) => s.replace(normalize(a.name),''),description).replace(/\band\b|\bof\b/g,'').trim();
      if (residual || !matched.length) unknown.add(match[2]);
      for (const p of body) covered[p] = matched;
    }
    return {covered,worn:[...worn],unknown:[...unknown],parts};
  }
  function score(a, mode) {
    const values = [a.sharp,a.pierce,a.blunt];
    if (values.some(v => v === null)) return 0;
    if (['sharp','pierce','blunt'].includes(mode)) return a[mode];
    const average = values.reduce((s,v)=>s+v,0)/3;
    return mode === 'light' ? average/Math.max(a.weight,0.1) : average;
  }
  function recommend(state, data, mode) {
    if (!Object.keys(state.covered).length) return [];
    const slots = {}, best = {};
    for (const a of state.worn) {
      for (const l of a.layers) slots[l] = (slots[l]||0)+1;
      for (const p of a.coverage) best[p] = Math.max(best[p]||0,score(a,mode));
    }
    const remaining = data.armours.filter(a => !state.worn.includes(a) && a.coverage.length && a.layers.length && score(a,mode)>0);
    const result=[];
    // Greedy weighted marginal protection, respecting every layer on an item.
    // The wiki doesn't document enough combat mechanics for an exact global optimum.
    for (let iteration=0;iteration<12;iteration++) {
      let chosen=null, gain=0;
      for (const a of remaining) {
        if (a.layers.some(l => !(l in data.layers) || (slots[l]||0)>=data.layers[l])) continue;
        const g = a.coverage.reduce((sum,p)=>sum+Math.max(0,score(a,mode)-(best[p]||0)),0);
        if (g>gain || (g===gain && g>0 && a.weight<chosen.weight)) {chosen=a;gain=g;}
      }
      if (!chosen) break;
      const improves = chosen.coverage.filter(p => score(chosen,mode)>(best[p]||0));
      result.push({armour:chosen,kind:'Add',improves});
      for (const l of chosen.layers) slots[l]=(slots[l]||0)+1;
      for (const p of chosen.coverage) best[p]=Math.max(best[p]||0,score(chosen,mode));
      remaining.splice(remaining.indexOf(chosen),1);
    }
    // Also offer same-layer replacements, checked against the actual worn set.
    for (const old of state.worn) {
      const candidates=data.armours.filter(a => a.layers.length===old.layers.length && a.layers.every(l=>old.layers.includes(l)) && old.coverage.every(p=>a.coverage.includes(p)) && score(a,mode)>score(old,mode));
      candidates.sort((a,b)=>score(b,mode)-score(a,mode)||a.weight-b.weight);
      if (candidates.length) result.push({armour:candidates[0],kind:'Replace '+old.name,improves:candidates[0].coverage});
    }
    return result;
  }
  root.ArmourAdvisor = {parse,recommend,score};
})(typeof window !== 'undefined' ? window : globalThis);
