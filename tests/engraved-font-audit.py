"""Audit deployed font data, including aliases crossing unicode-range files."""
import hashlib,json
from pathlib import Path
from fontTools.ttLib import TTFont
root=Path(__file__).resolve().parents[1]
audit=json.loads((root/'fonts/engraved-sc-audit.json').read_text())
fonts=[TTFont(root/item['path']) for item in audit['files']]
maps=[f.getBestCmap() for f in fonts];cache={}
def shape(char):
 cp=ord(char)
 for index,(f,cm) in enumerate(zip(fonts,maps)):
  if cp not in cm:continue
  name=cm[cp];key=(index,name)
  if key not in cache:
   coords,ends,flags=f['glyf'][name].getCoordinates(f['glyf'])
   cache[key]=hashlib.sha256(repr((list(coords),list(ends),list(flags),f['hmtx'][name])).encode()).hexdigest()
  return cache[key]
 raise AssertionError('Missing '+char)
failures=[(a,b) for a,b in audit['aliases'].items() if shape(a)!=shape(b)]
assert not failures,failures
for f in fonts:
 axis=f['fvar'].axes[0];assert (axis.axisTag,axis.minValue,axis.defaultValue,axis.maxValue)==('wght',200,400,900)
 assert any(r.nameID==0 and 'Public Domain' in r.toUnicode() for r in f['name'].names)
print(json.dumps({'fontParts':len(fonts),'simplifiedMappingsChecked':len(audit['aliases']),'mappingFailures':failures,'variableAxis':'200 / 400 / 900','copyrightPreserved':True},ensure_ascii=False,indent=2))
