const fs = require('fs');
const { createCanvas } = require('canvas');
const canvas = createCanvas(28, 28);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, 28, 28);
ctx.fillStyle = '#fff';
for(let i=0;i<10;i++) {
  ctx.fillRect(5+i*2, 10, 1, 8);
  ctx.fillRect(5+i*2, 18, 1, 8);
}
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('test-fashion.png', buffer);
console.log('Created test-fashion.png');