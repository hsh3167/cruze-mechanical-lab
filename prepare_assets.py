"""Prepare learning metadata and recover R4 route centrelines from GLB rings.
Geometry remains untouched; only the R4 tube's 8-sided ring centroids are used.
This script uses only Python's standard library.
"""
import json, math, struct, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent
GLB=ROOT/'cruze-full-r4.glb'

def prepare():
    b=GLB.read_bytes();size=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+size]);binstart=28+size
    def read(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];code={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']]
        return struct.unpack_from('<'+code*(a['count']*width),b,binstart+v.get('byteOffset',0)+a.get('byteOffset',0))
    paths={};route_meta={}
    for node in doc['nodes']:
        edge=node.get('extras',{}).get('flowEdge')
        if not edge:continue
        primitive=doc['meshes'][node['mesh']]['primitives'][0];pos=read(primitive['attributes']['POSITION']);indices=read(primitive['indices'])
        assert list(indices[:6])==[0,9,1,9,10,1],f'Unsupported tube topology: {edge}'
        assert len(pos)%27==0
        paths[edge]=[[round(sum(pos[start+3*i+j] for i in range(8))/8,6) for j in range(3)] for start in range(0,len(pos),27)]
        assert len(paths[edge])>=3
        route_meta[edge]={'kind':'main' if edge in ['upper_hose','radiator','lower_hose','thermostat'] else 'bypass' if edge=='bypass' else 'always','partId':node['name']}
    assert len(paths)==19
    info=json.loads((ROOT/'v2-learning.json').read_text(encoding='utf-8'))
    labels={'engine':'엔진·동력기구','intake':'흡기·터보','ignition':'점화·분사','cooling':'냉각','lubrication':'윤활','transmission':'변속기',
        'structure':'차체 골격','suspension':'서스펜션·구동축','steering':'조향','brakes':'브레이크','wheels':'휠·타이어','exhaust':'배기',
        'fuel':'연료','hvac':'공조','electrical':'전장','interior':'실내','body':'외장·유리'}
    explode={s:[0,0,0] for s in labels}
    explode.update(engine=[0,1.6,0],cooling=[2,0,2],intake=[0,1,2],ignition=[0,2,0],lubrication=[0,-1.2,1],transmission=[-3,0,0],
        body=[0,4,0],interior=[0,2,0],structure=[0,-1,0],suspension=[3,-1,0],wheels=[5,0,0],brakes=[4,0,0],hvac=[0,2,-1])
    info.update(systemLabels=labels,explode=explode,coolingPaths=paths,coolingRouteMeta=route_meta,
        provenance={'geometry':'Original R4 GLB','base_meshes':465,'v2_features':['4-stroke','combustion','oil-flow','part-explanations'],
        'r4_sha256':hashlib.sha256(b).hexdigest(),'cooling_paths':'19 centrelines extracted from original R4 route geometry; not CFD'})
    (ROOT/'learning.json').write_text(json.dumps(info,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    summary={'r4_meshes':len(doc['meshes']),'v2_effects':len(info['combustion']),'total_display_objects':len(doc['meshes'])+len(info['combustion']),
             'systems':17,'cooling_paths':len(paths),'original_r4_sha256':hashlib.sha256(b).hexdigest()}
    (ROOT/'integration-check.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary))

if __name__=='__main__':prepare()
