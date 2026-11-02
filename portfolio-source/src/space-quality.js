// Render solid geometry directly into the antialiased output buffer. Soft
// plumes and near/far particle defocus belong to their own materials; a reduced
// scene target followed by blur erases the reference's sharp metal edges.
export function scenePixelRatio(width,height,deviceRatio=1,mobile=false,quality=1){
 const device=Math.min(deviceRatio,mobile?1.35:1.65);
 const budget=Math.sqrt((mobile?1_000_000:3_000_000)/Math.max(1,width*height));
 // Shed supersampling before native CSS pixels. Only very large viewports
 // need sub-native resolution to remain within the existing pixel budget.
 return Math.min(device,budget,Math.max(1,device*quality));
}
