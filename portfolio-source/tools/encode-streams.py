"""Build independent, aligned two-second AVC/AAC HLS segments. Originals stay untouched."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import subprocess, json, re, os

root = Path(__file__).resolve().parents[1]
media = root / 'public/media'
out = media / 'stream-v1'
ffmpeg = os.environ.get('FFMPEG', r'D:\Python312\Scripts\ffmpeg.exe')
sources = {**{i: f'{i}-demo-hd.mp4' for i in ('ash','csol')},
           **{i: f'{i}-demo-audio.mp4' for i in ('tower','mines')},
           **{i: f'{i}-1080.mp4' for i in ('murphy','hyrum','familiar','town','arc')}}
jobs=[]
for id,source in sources.items():
    fps_game=id in ('ash','csol')
    levels=[('low60' if fps_game else 'low',854,60 if fps_game else 30,27,650),('720',1280,60 if fps_game else 30,23,2100 if fps_game else 1000)]
    if id not in ('tower','mines'):
        levels.append(('hd',1544 if fps_game else 1920,60 if fps_game else 30,22,4200 if fps_game else 2400))
    for level,width,fps,crf,rate in levels: jobs.append((id,source,level,width,fps,crf,rate))

def encode(job):
    id,source,level,width,fps,crf,rate=job
    dest=out/id/level;dest.mkdir(parents=True,exist_ok=True)
    playlist=dest/'index.m3u8'
    # Existing completed outputs are reusable; never truncate a published hard link.
    if not playlist.exists() or not (dest/'init.mp4').exists() or '#EXT-X-ENDLIST' not in playlist.read_text():
        command=[ffmpeg,'-y','-hide_banner','-loglevel','error','-i',str(media/source),
            '-map','0:v:0','-map','0:a:0','-vf',f'scale={width}:-2:flags=lanczos,fps={fps},setsar=1',
            '-c:v','libx264','-preset','medium','-threads','3','-crf',str(crf),'-maxrate',f'{rate}k',
            '-bufsize',f'{rate*2}k','-pix_fmt','yuv420p','-profile:v','high','-g',str(fps*2),
            '-keyint_min',str(fps*2),'-sc_threshold','0','-force_key_frames','expr:gte(t,n_forced*2)',
            '-c:a','copy','-map_metadata','-1','-f','hls','-hls_time','2','-hls_playlist_type','vod',
            '-hls_segment_type','fmp4','-hls_flags','independent_segments',
            '-hls_fmp4_init_filename','init.mp4','-hls_segment_filename','part-%03d.m4s','index.m3u8']
        subprocess.run(command,cwd=dest,check=True)
    text=playlist.read_text();durations=[float(t) for t in re.findall(r'#EXTINF:([\d.]+)',text)]
    parts=[dest/line for line in text.splitlines() if line and not line.startswith('#')]
    init=(dest/'init.mp4').read_bytes();p=init.index(b'avcC')
    codec='avc1.'+init[p+5:p+8].hex()
    # Resolution comes from the sample entry, not guessed from a 16:9 aspect ratio.
    avc=init.index(b'avc1');w=int.from_bytes(init[avc+28:avc+30],'big');h=int.from_bytes(init[avc+30:avc+32],'big')
    total=sum(p.stat().st_size for p in parts)
    # HLS peak bandwidth uses a 0.5–1.5 target-duration window; a tiny final
    # audio tail must not inflate the advertised rate of a low rendition.
    windows=[]
    for i in range(len(parts)):
        span=0;size=0
        for j in range(i,min(i+2,len(parts))):
            span+=durations[j];size+=parts[j].stat().st_size
            if 1<=span<=3:windows.append(size*8/span)
    peak=max(windows)
    return {'id':id,'level':level,'width':w,'height':h,'fps':fps,'codec':codec,'seconds':sum(durations),
        'average':round(total*8/sum(durations)),'peak':round(peak*1.1),'bytes':total+len(init),
        'firstBytes':parts[0].stat().st_size+len(init),'parts':len(parts),'audio':'copied AAC'}

if __name__=='__main__':
    rows=[]
    with ThreadPoolExecutor(max_workers=2) as pool:
        for result in as_completed([pool.submit(encode,j) for j in jobs]):
            row=result.result();rows.append(row);print(json.dumps(row),flush=True)
    catalog={}
    for id in sources:
        levels=sorted([r for r in rows if r['id']==id],key=lambda r:r['width'])
        lines=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-INDEPENDENT-SEGMENTS']
        for r in levels:
            lines += [f'#EXT-X-STREAM-INF:BANDWIDTH={r["peak"]},AVERAGE-BANDWIDTH={r["average"]},RESOLUTION={r["width"]}x{r["height"]},FRAME-RATE={r["fps"]:.3f},CODECS="{r["codec"]},mp4a.40.2"',r['level']+'/index.m3u8']
        (out/id/'master.m3u8').write_text('\n'.join(lines)+'\n',encoding='utf-8')
        catalog[id]={'path':f'media/stream-v1/{id}/master.m3u8','levels':levels}
    (root/'src/stream-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
    print('All streams complete',flush=True)
