function assert(x,message) {if(!x)throw Error(message);}
const A=ArmourAdvisor,D=ARMOUR_LIBRARY;
let state=A.parse(['Your back is protected by the Grflx scale and could be protected by the lamb skin cape.','Your feet are unprotected.'],D.armours);
assert(state.worn.length===1&&state.worn[0].name==='Grflx scale','actual worn only');
assert(state.covered.feet.length===0,'unprotected');
assert(!state.covered.neck,'omitted is unknown');
assert(A.parse(["Kake’s back is protected by the Grflx scale."],D.armours).worn.length===0,'other character');
assert(A.parse(['Your feet could be protected by the pair of blue suede shoes.'],D.armours).worn.length===0,'unworn');
assert(A.parse(['Your head, feet, legs, hands, arms and neck are unprotected.'],D.armours).covered.neck.length===0,'plural');
assert(A.parse(['Your feet are protected by the pair of unknown boots.'],D.armours).unknown.length===1,'unknown');
const suggestions=A.recommend(state,D,'balanced');assert(suggestions.length>0,'suggestions');
const counts={};for(const a of state.worn)for(const l of a.layers)counts[l]=(counts[l]||0)+1;
for(const r of suggestions.filter(r=>r.kind==='Add'))for(const l of r.armour.layers){counts[l]=(counts[l]||0)+1;assert(counts[l]<=D.layers[l],'layer capacity');}
assert(A.recommend(A.parse([],D.armours),D,'balanced').length===0,'no snapshot');
const old={name:'old',layers:['shirt','leggings'],coverage:['chest','legs'],weight:1,sharp:10,pierce:10,blunt:10};
const next={...old,name:'new',sharp:20,pierce:20,blunt:20};
const sample={armours:[old,next],layers:{shirt:1,leggings:1}};
const results=A.recommend({covered:{chest:[old]},worn:[old],unknown:[]},sample,'balanced');
assert(results.length===1&&results[0].kind==='Replace old','multi layer replacement');
