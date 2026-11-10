// Every check of every UI test is also written to the report file (VANTAGE_REPORT) so tools/ui-tests/features.js can prove that every
// tab and every feature has passing checks. Without the variable nothing is written (a test file can still be run alone).
const fs=require('fs'), path=require('path');
exports.rec=(file,ok,msg)=>{ const f=process.env.VANTAGE_REPORT; if(!f) return; try{ fs.appendFileSync(f, JSON.stringify({file:path.basename(file),ok:!!ok,msg:String(msg)})+'\n'); }catch{} };
exports.click=(k)=>{ const f=process.env.VANTAGE_REPORT; if(!f) return; try{ fs.appendFileSync(f, JSON.stringify({click:k})+'\n'); }catch{} };
