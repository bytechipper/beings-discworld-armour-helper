class Node {
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.listeners={};this.isConnected=true;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 addEventListener(name,fn){this.listeners[name]=fn;}
 focus(){}
 showModal(){this.open=true;}
 close(){this.open=false;this.listeners.close?.();}
}
const nodes={};
globalThis.document={getElementById:id=>nodes[id]??(nodes[id]=new Node(id)),createElement:tag=>new Node(tag)};
nodes.priority=new Node('select');nodes.priority.value='balanced';
let onCoverage;
window.panel={on:(name,fn)=>{onCoverage=fn;},post:()=>{}};
