"""Build a simplified-display variable derivative; requires fonttools[woff], freetype-py, opencc in a build-only environment."""
import ctypes,copy,json,os
from pathlib import Path
import freetype,opencc
from fontTools.ttLib import TTFont, woff2
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program
from fontTools.designspaceLib import DesignSpaceDocument, AxisDescriptor, SourceDescriptor
from fontTools.varLib import build
from fontTools import subset
ROOT=Path(__file__).resolve().parents[1]
TMP=Path('/tmp/newsroom-engraved-build');TMP.mkdir(exist_ok=True)
font=TTFont(ROOT/'fonts/engraved-huiwen.woff2');font.flavor=None
cm=font.getBestCmap()
# Render traditional input with simplified outlines without rewriting article text.
dictionary=Path(opencc.__file__).parent/'dictionary'/'TSCharacters.txt'
char_map={line.split('\t')[0]:line.split('\t')[1].split()[0] for line in dictionary.read_text().splitlines() if '\t' in line}
for char,simple in list(char_map.items()):
 seen={char}
 while simple in char_map and char_map[simple]!=simple and simple not in seen:
  seen.add(simple);simple=char_map[simple]
 char_map[char]=simple
aliases={ord(char):cm[ord(simple)] for char,simple in char_map.items() if len(simple)==1 and char!=simple and ord(simple) in cm}
for table in font['cmap'].tables:
 if table.isUnicode():table.cmap=dict(table.cmap,**{}) ;table.cmap.update({k:v for k,v in aliases.items() if table.format==12 or k<=65535})
# Remove instructions: moved outlines must not execute hints for the old outlines.
for tag in ['fpgm','prep','cvt ','DSIG']:
 if tag in font:del font[tag]
glyf=font['glyf']
for name in font.getGlyphOrder():
 old=glyf[name];coords,ends,flags=old.getCoordinates(glyf)
 new=Glyph();new.numberOfContours=len(ends)
 if ends:
  new.coordinates=GlyphCoordinates(coords);new.endPtsOfContours=list(ends);new.flags=bytearray(flags);new.program=Program();new.program.fromBytecode([])
 glyf[name]=new
for r in font['name'].names:
 if r.nameID in [1,4,6,16,17]:
  val={1:'Wuqang Engraved SC',4:'Wuqang Engraved SC Regular',6:'WuqangEngravedSC-Regular',16:'Wuqang Engraved SC',17:'Regular'}[r.nameID]
  r.string=val.encode(r.getEncoding(),errors='replace')
font['name'].setName('Derivative of Huiwen-mincho by Terri Wong; simplified display mappings and generated outline weights by newsroom. Original copyright: Public Domain.',10,3,1,0x409)
font['OS/2'].usWeightClass=400
print('flattened',flush=True)
for weight,strength in [(200,-8),(400,0),(900,24)]:
 print('begin',weight,flush=True)
 f=copy.deepcopy(font)
 if strength:
  for name in f.getGlyphOrder():
   g=f['glyf'][name]
   if g.numberOfContours<=0:continue
   points=(freetype.FT_Vector*len(g.coordinates))(*(freetype.FT_Vector(int(x)*64,int(y)*64) for x,y in g.coordinates))
   tags=(ctypes.c_ubyte*len(g.flags))(*(int(x)&1 for x in g.flags))
   contours=(ctypes.c_short*len(g.endPtsOfContours))(*g.endPtsOfContours)
   outline=freetype.FT_Outline(len(contours),len(points),points,tags,contours,0)
   err=freetype.FT_Outline_Embolden(ctypes.byref(outline),strength*64)
   if err:raise RuntimeError((name,err))
   g.coordinates=GlyphCoordinates([(round(p.x/64-strength/2),round(p.y/64-strength/2)) for p in points])
   g.recalcBounds(f['glyf'])
 f['OS/2'].usWeightClass=weight;f.save(TMP/f'{weight}.ttf');print('master',weight,flush=True)
doc=DesignSpaceDocument();axis=AxisDescriptor();axis.name='Weight';axis.tag='wght';axis.minimum=200;axis.default=400;axis.maximum=900;doc.addAxis(axis)
for w in [200,400,900]:
 s=SourceDescriptor();s.path=str(TMP/f'{w}.ttf');s.name=f'master{w}';s.familyName='Wuqang Engraved SC';s.styleName=str(w);s.location={'Weight':w};s.copyInfo=s.copyLib=s.copyFeatures=(w==400);doc.addSource(s)
doc.write(TMP/'font.designspace');original_compress=woff2.brotli.compress
woff2.brotli.compress=lambda data,**kwargs:original_compress(data,quality=6,**kwargs)
vf,_,_=build(TMP/'font.designspace',optimize=False);vf.flavor='woff2';vf.save(TMP/'engraved-sc-variable.woff2')
(ROOT/'fonts/engraved-sc-audit.json').write_text(json.dumps({'base':'Huiwen-mincho v1.00','weightAxis':[200,400,900],'mastersOutlineStrength':[-8,0,24],'simplifiedDisplayAliases':len(aliases),'note':'Generated derivative weights, not original designer masters; source text unchanged.','aliases':{chr(k):char_map[chr(k)] for k in aliases}},ensure_ascii=False,indent=2))
print('done',len(aliases),flush=True)

files=[]
for index,lo,hi in [('0',0,0x5fff),('1a',0x6000,0x77ff),('1b',0x7800,0x8fff),('2',0x9000,0x10ffff)]:
 f=TTFont(TMP/'engraved-sc-variable.woff2',recalcBBoxes=False,recalcTimestamp=False)
 opts=subset.Options();opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*'];opts.recalc_bounds=False
 sub=subset.Subsetter(options=opts);sub.populate(unicodes=[cp for cp in f.getBestCmap() if lo<=cp<=hi]);sub.subset(f)
 path=ROOT/f'fonts/engraved-sc-{index}.woff2';f.flavor='woff2';f.save(path)
 files.append({'path':str(path.relative_to(ROOT)),'unicodeRange':[lo,hi],'size':path.stat().st_size})
p=ROOT/'fonts/engraved-sc-audit.json';audit=json.loads(p.read_text());audit['files']=files;p.write_text(json.dumps(audit,ensure_ascii=False,indent=2))
