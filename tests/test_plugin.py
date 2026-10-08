import ctypes, ctypes.util, json, subprocess, sys, tempfile, unittest, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
DATA=json.loads((ROOT/'ui/armours.js').read_text().split(' = ',1)[1][:-2])

class PluginTests(unittest.TestCase):
    def test_catalogue(self):
        self.assertEqual(len(DATA['armours']),270)
        self.assertTrue(all(a['article'] and a['source'].startswith('https://') for a in DATA['armours']))
        self.assertTrue(all('style' not in a['name'] for a in DATA['armours']))
        self.assertEqual(DATA['layers']['shirt'],2)
        self.assertTrue(any(a['name']=='padded cloth socks' for a in DATA['armours']))

    def test_capture(self):
        lib=ctypes.CDLL(ctypes.util.find_library('lua5.4'))
        for name,args,result in [('luaL_newstate',[],ctypes.c_void_p),('luaL_openlibs',[ctypes.c_void_p],None),('luaL_loadstring',[ctypes.c_void_p,ctypes.c_char_p],ctypes.c_int),('lua_pcallk',[ctypes.c_void_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_longlong,ctypes.c_void_p],ctypes.c_int),('lua_tolstring',[ctypes.c_void_p,ctypes.c_int,ctypes.c_void_p],ctypes.c_char_p),('lua_close',[ctypes.c_void_p],None)]:
            fn=getattr(lib,name);fn.argtypes=args;fn.restype=result
        state=lib.luaL_newstate();lib.luaL_openlibs(state)
        code='''
local sent, events, ready, timeout, last
local panel={post=function(_,name,data) assert(name=="coverage"); last=data end,
on_message=function(_,name,cb) ready=cb end}
mud={panel=function() return panel end,on_send=function(pattern,cb) sent=cb end,
delay=function(ms,cb) timeout=cb; return {remove=function() end} end}
world={on=function(name,cb) events=events or {}; events[name]=cb end}
'''+(ROOT/'src/main.lua').read_text()+'''
ready(); assert(last.status=="idle")
assert(sent()==nil)
events.line({text="Your back is protected by the Grflx scale and could be protected by the"})
events.line({text="lamb skin cape."})
events.line({text="Your chest is protected by the Grflx scale."})
events.line({text="Other game output."})
assert(last.status=="complete" and #last.lines==2)
assert(last.lines[1]:find("lamb skin cape",1,true))
sent(); timeout(); assert(last.status=="empty" and #last.lines==0)
sent(); events.line({text="Your feet are unprotected."});timeout()
assert(last.status=="complete" and #last.lines==1)
events.disconnect();assert(last.status=="idle" and #last.lines==0)
'''
        try:
            result=lib.luaL_loadstring(state,code.encode()) or lib.lua_pcallk(state,0,0,0,0,None)
            self.assertEqual(result,0,lib.lua_tolstring(state,-1,None))
        finally:lib.lua_close(state)

    def test_advisor(self):
        lib=ctypes.CDLL(ctypes.util.find_library('javascriptcoregtk-4.1'))
        ptr=ctypes.c_void_p
        for name,args,result in [('JSGlobalContextCreate',[ptr],ptr),('JSStringCreateWithUTF8CString',[ctypes.c_char_p],ptr),('JSEvaluateScript',[ptr,ptr,ptr,ptr,ctypes.c_int,ctypes.POINTER(ptr)],ptr),('JSStringRelease',[ptr],None),('JSGlobalContextRelease',[ptr],None)]:
            f=getattr(lib,name);f.argtypes=args;f.restype=result
        ctx=lib.JSGlobalContextCreate(None)
        code=(ROOT/'ui/armours.js').read_text()+(ROOT/'ui/recommend.js').read_text()+(ROOT/'tests/advisor.js').read_text()+(ROOT/'tests/panel.js').read_text()+(ROOT/'ui/panel.js').read_text()+'''
assert(nodes.armours.children.length===270,'library renders');
nodes.search.value='grflx';nodes.search.listeners.input();
assert(nodes.armours.children.length>0&&nodes.armours.children.length<270,'search filters');
nodes.armours.children[0].children[0].listeners.click();
assert(nodes['armour-dialog'].open&&nodes['detail-content'].children.length>0,'details open');
nodes['close-detail'].listeners.click();assert(!nodes['armour-dialog'].open,'details close');
onCoverage({lines:['Your feet are unprotected.'],status:'complete'});
assert(nodes.recommendations.children.length>0,'recommendations render');
'''
        code='var window=globalThis;'+code
        s=lib.JSStringCreateWithUTF8CString(code.encode());error=ptr()
        try:
            lib.JSEvaluateScript(ctx,s,None,None,1,ctypes.byref(error))
            self.assertFalse(error.value,'JavaScript advisor assertion failed')
        finally:lib.JSStringRelease(s);lib.JSGlobalContextRelease(ctx)

    def test_archive(self):
        with tempfile.TemporaryDirectory() as d:
            a,b=Path(d)/'a.mallardx',Path(d)/'b.mallardx'
            for p in [a,b]:subprocess.run([sys.executable,str(ROOT/'scripts/build.py'),str(p)],check=True,capture_output=True)
            self.assertEqual(a.read_bytes(),b.read_bytes())
            with zipfile.ZipFile(a) as z:
                self.assertIn('ui/recommend.js',z.namelist()); self.assertIn('src/main.lua',z.namelist())
                self.assertNotIn('DESC',z.namelist())

if __name__=='__main__':unittest.main()
