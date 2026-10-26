from pathlib import Path
root=Path(__file__).parent
html=(root/'web/index.html').read_text()
css=(root/'web/style.css').read_text()
logic=(root/'web/logic.mjs').read_text().replace('export const ','const ').replace('export function ','function ')
tracker=(root/'web/tracker.mjs').read_text().replace('export const ','const ').replace('export function ','function ')
builds=(root/'web/builds.mjs').read_text().replace("import { analyzeTeam } from './logic.mjs';",'').replace('export const ','const ').replace('export function ','function ')
app=(root/'web/app.mjs').read_text()
for line in app.splitlines():
    if line.startswith('import '):app=app.replace(line,'')
assert 'import ' not in app
html=html.replace('<link rel="stylesheet" href="./style.css" />','<style>\n'+css+'\n</style>')
html=html.replace('<script type="module" src="./app.mjs"></script>', '<script type="module">\n'+logic+'\n'+tracker+'\n'+builds+'\n'+app+'\n</script>')
assert 'src="./app.mjs"' not in html
(root/'LaneLite_v03_Demo.html').write_text(html)
Path('/mnt/data/LaneLite_v03_Demo.html').write_text(html)
print('Generated demo:',len(html),'bytes')
