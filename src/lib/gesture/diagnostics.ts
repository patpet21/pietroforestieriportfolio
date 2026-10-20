/** Bounded, local aggregates only. No video, form values or element text. */
export class GestureDiagnostics{
 enabled:boolean;
 values:Record<string,unknown>={};
 counters:Record<string,number>={};
 private samples:Record<string,number[]>={};
 constructor(enabled=false){this.enabled=enabled;}
 record(stage:string,ms:number){
  if(!this.enabled)return;
  const samples=this.samples[stage]??(this.samples[stage]=[]);
  samples.push(ms);if(samples.length>240)samples.shift();
 }
 count(name:string){if(this.enabled)this.counters[name]=(this.counters[name]||0)+1;}
 snapshot(){
  const timings=Object.fromEntries(Object.entries(this.samples).map(([name,values])=>{
   const sorted=[...values].sort((a,b)=>a-b);
   const at=(p:number)=>Math.round((sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]||0)*10)/10;
   return [name,{p50:at(.5),p95:at(.95),p99:at(.99),samples:sorted.length}];
  }));
  return {...this.values,counters:{...this.counters},timings};
 }
}
/** Budget from measured total synchronous work; no queued camera frames. A 55%
 * duty cycle leaves time for input/paint, with a 24Hz maximum on fast hardware. */
export class FrameBudget{
 private work=0;
 interval=1000/24;
 observe(ms:number){
  this.work=this.work?this.work*.8+ms*.2:ms;
  this.interval=Math.max(1000/24,Math.min(250,this.work/.55));
 }
}
