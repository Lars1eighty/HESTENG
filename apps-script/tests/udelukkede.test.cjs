const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname,'../hestengUdelukkede.gs'),'utf8');

function sheet(rows) {
  return {
    rows:rows.map(row=>row.slice()),
    getLastRow(){return this.rows.length;},
    getRange(r,c,n,m){return {
      getValues:()=>this.rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+m)),
      clearContent:()=>{for(let i=r-1;i<r-1+n;i++)for(let j=c-1;j<c-1+m;j++)this.rows[i][j]='';},
      setValues:values=>{for(let i=0;i<values.length;i++)for(let j=0;j<m;j++)this.rows[r-1+i][c-1+j]=values[i][j];}
    };},
    deleteRow(i){this.rows.splice(i-1,1);}
  };
}

const tabs = {
  'Udelukkede':sheet([['Navn'],['Oliver ..'],['Tonny Soerensen Dyhrberg'],['Peter Plys'],['Mathias Hesteng'],['Rikke Westergaard'],['Tom Prtersen']]),
  'Players':sheet([['Navn','ELO'],['Tom Petersen',984],['Rikke Vestergaard',1072],['Oliver ..',1219],['Peter Plys',1163],['Mathias Hesteng',1151],['Tonny Soerensen Dyhrberg',1171],['Tom Prtersen',1174],['Rikke Westergaard',1123]]),
  'Tilmelding':sheet([['Med','Navn','ELO','','Tilmeldte',27],[true,'Tom Petersen',984],[false,'Rikke Vestergaard',1072],[false,'Peter Plys',1163]]),
  'Øvrige spillere':sheet([['Med','Navn','ELO'],[false,'Oliver ..',1219],[false,'Mathias Hesteng',1151],[false,'Tonny Soerensen Dyhrberg',1171],[false,'Rikke Westergaard',1123],[false,'Tom Prtersen',1174]])
};
const context = vm.createContext({
  SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:name=>tabs[name]})},
  Logger:{log:()=>{}}
});
vm.runInContext(source,context);
const first=context.hestengRydUdelukkede();
assert.equal(first.Players,6);
assert.equal(first.Tilmelding,1);
assert.equal(first['Øvrige spillere'],5);
assert.deepEqual(tabs.Players.rows.slice(1).map(row=>row[0]),['Tom Petersen','Rikke Vestergaard']);
assert.deepEqual(tabs.Tilmelding.rows.slice(1).map(row=>row[1]).filter(Boolean),['Tom Petersen','Rikke Vestergaard']);
assert.equal(tabs.Tilmelding.rows[0][5],27);
assert.equal(context.hestengRydUdelukkede().Players,0);
tabs.Players.rows.push(['Oliver ..',1219]);
assert.equal(context.hestengRydUdelukkede().Players,1);
assert.equal(tabs.Udelukkede.rows.length,7);
console.log('PASS: six excluded, similar names preserved, idempotent re-cleanup');
