// A transparent twig with distinct pointed leaves, rather than a filled round clump.
export function createLeafCanvas(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
 ctx.strokeStyle='#617b40';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(128,244);ctx.bezierCurveTo(121,181,139,105,127,22);ctx.stroke();
 function leaf(x,y,angle,length,width,tone){
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(width/18,length/55);
  ctx.fillStyle=tone;ctx.beginPath();ctx.moveTo(0,18);ctx.bezierCurveTo(-20,7,-19,-16,0,-37);ctx.bezierCurveTo(17,-19,21,4,0,18);ctx.closePath();ctx.fill();
  ctx.fillStyle='#789650';ctx.beginPath();ctx.moveTo(0,17);ctx.bezierCurveTo(-13,4,-13,-17,0,-37);ctx.lineTo(-1,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#aac477';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(0,21);ctx.quadraticCurveTo(-2,-8,0,-33);ctx.stroke();
  ctx.strokeStyle='#849f59';ctx.lineWidth=.65;for(let j=0;j<4;j++){const y=8-j*9;ctx.beginPath();ctx.moveTo(0,y);ctx.quadraticCurveTo(-6,y-3,-12+j*2,y-10);ctx.moveTo(0,y);ctx.quadraticCurveTo(6,y-3,12-j*2,y-10);ctx.stroke();}ctx.restore();
 }
 // Alternating leaves expose the stem and preserve open space between silhouettes.
 leaf(128,53,-.04,66,25,'#426f38');
 for(let j=0;j<3;j++)for(const side of [-1,1]){const y=96+j*48+(side>0?9:0),x=128+side*(31+j*5);ctx.strokeStyle='#617b40';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(128,y+12);ctx.quadraticCurveTo(128+side*14,y+8,x,y);ctx.stroke();leaf(x,y,side*.95,62+j*7,25+j*2,j%2?'#527d3c':'#3e6d35');}
 return canvas;
}
