"""Render an explicitly labelled synthetic workflow illustration, not a screen recording."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import subprocess, sys, math
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
W,H,FPS,SECONDS=1280,720,20,32
font='/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
fonts={n:ImageFont.truetype(font,n) for n in [16,18,20,22,24,28,32,38,46,60]}
navy='#14253D';blue='#245FE5';muted='#66758A';bg='#F4F6FA';green='#187654'
rows=[['任务','负责人','状态'],['需求梳理','示例成员 A','待开始'],['原型设计','示例成员 B','进行中'],['方案评审','示例成员 C','待开始']]
proc=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'feishu-mcp-synthetic-demo.mp4')],stdin=subprocess.PIPE)
def text(d,xy,s,size=24,fill=navy):d.text(xy,s,font=fonts[size],fill=fill)
def box(d,rect,fill='white',border='#DFE5EF',radius=18):d.rounded_rectangle(rect,radius,fill=fill,outline=border,width=1)
def table(d,x,y,width=1030,rowh=56):
 cols=[0,.46,.73,1]
 for i,row in enumerate(rows):
  d.rectangle((x,y+i*rowh,x+width,y+(i+1)*rowh),fill='#EAF0FE' if i==0 else 'white',outline='#E0E6EF')
  for j,v in enumerate(row):text(d,(x+int(width*cols[j])+22,y+i*rowh+15),v,22)
def footer(d,t):
 text(d,(48,664),'合成数据 · 流程示意（非产品录屏）',18,muted)
 text(d,(1000,664),'@cyuanxv',20,navy)
 d.rectangle((0,710,int(W*t/SECONDS),720),fill=blue)
def cursor(d,x,y,click=False):
 if click:d.ellipse((x-22,y-22,x+22,y+22),outline='#97B5FF',width=4)
 d.polygon([(x,y),(x+3,y+26),(x+10,y+19),(x+18,y+31),(x+24,y+27),(x+16,y+15),(x+26,y+13)],fill=navy)
for frame in range(FPS*SECONDS):
 t=frame/FPS;im=Image.new('RGB',(W,H),bg);d=ImageDraw.Draw(im)
 text(d,(48,27),'Feishu MCP',28);box(d,(1035,24,1232,61),'#E9EFFC',radius=16);text(d,(1055,34),'LOCAL PREVIEW',16,blue)
 if t<5:
  text(d,(78,165),'给你的 AI，',60);text(d,(78,245),'一整套飞书工作能力。',60)
  text(d,(82,358),'一次表格写入，带你看懂整个流程',28,muted)
  for i,label in enumerate(['提出需求','完整预览','明确确认','查看结果']):
   x=82+i*292;box(d,(x,458,x+254,530),'white');text(d,(x+25,479),f'0{i+1}  {label}',24)
 elif t<12:
  text(d,(60,98),'01  提出需求',38)
  box(d,(60,170,1220,590));text(d,(95,200),'你',20,blue)
  lines=['把下面三项工作计划写入“项目计划演示表”。','需求梳理 / 示例成员 A / 待开始','原型设计 / 示例成员 B / 进行中','方案评审 / 示例成员 C / 待开始']
  for i,line in enumerate(lines):
   if t>=5+i*.65:text(d,(95,250+i*50),line,28 if i==0 else 24)
  if t>=9:box(d,(93,492,1185,554),'#EEF3FF',border='#EEF3FF');text(d,(115,509),'AI 准备写入预览；此时尚未修改表格。',24,blue)
 elif t<22:
  text(d,(60,98),'02  先看清楚，再确认',38)
  box(d,(60,170,1220,612));text(d,(95,190),'目标：项目计划演示表   /   范围：A1:C4   /   12 个单元格',24)
  table(d,95,244,1090,54)
  text(d,(95,483),'确认前核对目标与内容；写入可能覆盖该范围原有数据。',20,muted)
  box(d,(923,531,1185,590),blue,border=blue);text(d,(962,547),'确认本次写入',24,'white')
  box(d,(720,531,900,590),'white');text(d,(780,547),'取消',24)
  if t>18:cursor(d,1100,560,click=(20<t<21))
  if t>=21:box(d,(895,531,1185,590),'#DFEEE7',border='#DFEEE7');text(d,(942,547),'模拟确认已提交',24,green)
 elif t<28:
  text(d,(60,98),'03  查看结果，再独立核对',38)
  box(d,(60,170,1220,610));box(d,(94,194,1185,252),'#E4F3EB',border='#E4F3EB');text(d,(116,211),'模拟回执：写入成功 · 12 个单元格',24,green)
  table(d,95,278,1090,54)
  text(d,(98,530),'示意：回读目标区域，逐项核对任务、负责人和状态。',24)
  text(d,(98,571),'本动画使用虚构数据，未连接飞书，未写入真实表格。',18,muted)
 else:
  text(d,(78,172),'需求 → 预览 → 确认 → 结果',46)
  text(d,(82,274),'让 AI 参与工作，让每次写入有据可查。',32)
  text(d,(82,366),'文档 · 表格 · 日程 · 会议室 · 任务 · 附件',28,muted)
  box(d,(82,453,805,531),blue,border=blue);text(d,(111,478),'关注 @cyuanxv，查看开发进展与工作流演示',24,'white')
  text(d,(82,559),'候选开源版 · 独立部署与授权后使用',22,muted)
 footer(d,t)
 if frame in [0,7*FPS,15*FPS,24*FPS,29*FPS]:im.save(out/f'demo-frame-{int(t):02d}.png')
 proc.stdin.write(im.tobytes())
proc.stdin.close();assert proc.wait()==0
print('Rendered 32s 1280x720 H264 video; no audio, no network, synthetic illustration only.')
