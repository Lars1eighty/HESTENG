/**
 * HESTENG Legacy – aktiv udelukkelsesliste.
 * Læser fanen "Udelukkede" og fjerner udelukkede spillere fra
 * Players, Tilmelding og Øvrige spillere. Historiske kampe og ELO-data
 * ændres ikke.
 *
 * Integration: Kald hestengFjernUdelukkedeFraLister_() som SIDSTE
 * linje i både syncPlayersFromLiveAktiv() og syncTilmeldingsLister().
 * På andre opdateringsveje, der genopbygger Players, skal oprydningen
 * også kaldes efter de nye data er skrevet.
 */
function hestengUdelukketNoegle_(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function hestengHentUdelukkede_(ss) {
  const sheet = ss.getSheetByName('Udelukkede');
  if (!sheet) throw new Error('Fanen Udelukkede mangler. Ingen lister ændret.');
  if (sheet.getLastRow() < 2) return new Set();
  return new Set(
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .getValues()
      .map(row => hestengUdelukketNoegle_(row[0]))
      .filter(Boolean)
  );
}

/**
 * Kan kaldes efter hver synkronisering og fra Apps Script-menuen.
 * Kun de præcise navne i Udelukkede fjernes. Ingen fuzzy matching;
 * "Rikke Westergaard" påvirker fx ikke "Rikke Vestergaard".
 */
function hestengFjernUdelukkedeFraLister_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const blocked = hestengHentUdelukkede_(ss);
  const result = {};
  const tabs = [
    {name:'Players', col:1},
    {name:'Tilmelding', col:2},
    {name:'Øvrige spillere', col:2}
  ];
  const sheets = tabs.map(entry => ss.getSheetByName(entry.name));
  tabs.forEach((entry,i) => {
    if (!sheets[i]) throw new Error('Mangler fanen: ' + entry.name);
  });
  for (let tabIndex=0; tabIndex<tabs.length; tabIndex++) {
    const entry=tabs[tabIndex], sheet=sheets[tabIndex];
    const last = sheet.getLastRow();
    let removed = 0;
    if (last > 1 && blocked.size) {
      if (entry.name === 'Tilmelding') {
        // Slet ikke hele rækker her: E:F indeholder andre tællere/statusfelter.
        // Ryd kun A:C og behold afkrydsningerne på de tilbageværende navne.
        const range = sheet.getRange(2, 1, last - 1, 3);
        const data = range.getValues();
        const keep = data.filter(row =>
          !blocked.has(hestengUdelukketNoegle_(row[1])));
        removed = data.length - keep.length;
        if (removed) {
          range.clearContent();
          if (keep.length) sheet.getRange(2, 1, keep.length, 3).setValues(keep);
        }
      } else {
        const names = sheet.getRange(2, entry.col, last - 1, 1).getValues();
        for (let i = names.length - 1; i >= 0; i--) {
          if (blocked.has(hestengUdelukketNoegle_(names[i][0]))) {
            sheet.deleteRow(i + 2);
            removed++;
          }
        }
      }
    }
    result[entry.name] = removed;
  }
  Logger.log('Udelukkede ryddet: ' + JSON.stringify(result));
  return result;
}

/** Manuel kontrol i Apps Script. Skriver ikke i arkene. */
function hestengTestUdelukkede() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const blocked = hestengHentUdelukkede_(ss);
  Logger.log('Udelukkede (' + blocked.size + '): ' + [...blocked].join(', '));
  for (const [tab,col] of [['Players',1],['Tilmelding',2],['Øvrige spillere',2]]) {
    const sheet = ss.getSheetByName(tab);
    if (!sheet) throw new Error('Mangler fanen: ' + tab);
    const names = sheet.getLastRow() > 1 ? sheet
      .getRange(2,col,sheet.getLastRow()-1,1).getValues() : [];
    Logger.log(tab + ' – udelukkede fundet: ' + names
      .filter(row=>blocked.has(hestengUdelukketNoegle_(row[0])))
      .map(row=>String(row[0])).join(', '));
  }
}

/** Manuel oprydning, hvis en anden funktion har genoprettet spillere. */
function hestengRydUdelukkede() {
  return hestengFjernUdelukkedeFraLister_();
}
