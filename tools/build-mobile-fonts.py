from pathlib import Path
from fontTools.ttLib import TTFont,woff2
from fontTools import subset
import re,json,time
base=Path.cwd();tmp=Path('/tmp/newsroom-mobile-fonts');tmp.mkdir(exist_ok=True)
css=(base/'tools/noto-subset-ranges.css').read_text();ranges=re.findall(r'unicode-range:\s*([^;]+);',css)
def expand(value):
 result=set()
 for r in value.split(','):
  r=r.strip()[2:];a,*b=r.split('-');result.update(range(int(a,16),int(b[0],16)+1 if b else int(a,16)+1))
 return result
# Frequent character groups come last in Google's SC subset stylesheet.
groups=[]
for r in reversed(ranges):
 chars=expand(r)
 if groups and len(groups[-1])<650:groups[-1].update(chars)
 else:groups.append(chars)
print('groups',len(groups),[len(g) for g in groups[:5]],flush=True)
original=woff2.brotli.compress;woff2.brotli.compress=lambda data,**kw:original(data,quality=5,**kw)
outputs=[]
for family,source in [('engraved',tmp.parent/'newsroom-engraved-build/engraved-sc-variable.woff2'),('song',base/'fonts/body.woff2')]:
 raw=tmp/(family+'.ttf')
 if not raw.exists():
  f=TTFont(source,recalcBBoxes=False,recalcTimestamp=False);f.flavor=None;f.save(raw);print('decoded',family,flush=True)
 cm=TTFont(raw,lazy=True).getBestCmap();left=set(cm)
 bins=[]
 for group in groups:
  current=left&group
  if current:bins.append(current);left-=current
 if left:
  remaining=sorted(left);bins.extend(set(remaining[i:i+500]) for i in range(0,len(remaining),500))
 for index,chars in enumerate(bins):
  existing=base/f'fonts/mobile/{family}-{index}.woff2'
  if index<22 and existing.exists():
   outputs.append({'family':family,'path':str(existing.relative_to(base)),'chars':sorted(chars),'size':existing.stat().st_size});continue
  f=TTFont(raw,lazy=True,recalcBBoxes=False,recalcTimestamp=False)
  opts=subset.Options();opts.name_IDs=[0,1,2,3,4,5,6,10,13,14,16,17];opts.name_legacy=True;opts.name_languages=['*'];opts.recalc_bounds=False;opts.hinting=False
  sub=subset.Subsetter(options=opts);sub.populate(unicodes=chars);sub.subset(f)
  path=base/f'fonts/mobile/{family}-{index}.woff2';path.parent.mkdir(exist_ok=True);f.flavor='woff2';f.save(path)
  outputs.append({'family':family,'path':str(path.relative_to(base)),'chars':sorted(chars),'size':path.stat().st_size});print(family,index,len(chars),path.stat().st_size,flush=True)
Path('fonts/mobile/manifest.json').write_text(json.dumps(outputs,ensure_ascii=False,separators=(',',':')))
