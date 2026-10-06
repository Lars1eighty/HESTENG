"use client";

const QUICK_LEFT = [26, 41, 45, 100];
const QUICK_RIGHT = [60, 81, 85, 140];
const ROWS = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

type Props = {
  input: string;
  parts: number[];
  onInputChange: (value: string) => void;
  onPartsChange: (parts: number[]) => void;
  onEnter: (score: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  extraAction?: React.ReactNode;
};

export default function MasterScoreInput({ input, parts, onInputChange, onPartsChange, onEnter, onUndo, canUndo = false, extraAction }: Props) {
  const partsTotal = parts.reduce((sum, value) => sum + value, 0);
  const total = partsTotal + (input ? Number(input) : 0);

  function digit(n: number) {
    const next = input + n;
    if (Number(next) <= 180 && partsTotal + Number(next) <= 180) onInputChange(next);
  }

  function choose(n: number) {
    if (parts.length || input) {
      if (partsTotal + n <= 180) onInputChange(String(n));
      return;
    }
    onEnter(n);
  }

  function plus() {
    if (!input) return;
    const n = Number(input);
    if (partsTotal + n <= 180) {
      onPartsChange([...parts, n]);
      onInputChange("");
    }
  }

  function clear() {
    onInputChange("");
    onPartsChange([]);
  }

  function enter() {
    if (!input && !parts.length) return;
    if (total < 0 || total > 180) return;
    onEnter(total);
    clear();
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[minmax(180px,0.34fr)_96px_minmax(0,1fr)] gap-1">
        <div className="flex min-h-[56px] items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-6">
          <div className="text-2xl font-bold">{parts.length ? total : input}</div>
          <div className="text-gray-500">INDTASTET TAL</div>
        </div>
        <button type="button" onClick={clear} className="rounded-2xl border border-gray-800 bg-gray-900 text-xl font-bold">CLR</button>
        {extraAction ?? <div />}
      </div>

      <div className="grid grid-cols-5 gap-1">
        <div className="grid gap-1">
          {QUICK_LEFT.map((x) => <button type="button" key={x} onClick={() => choose(x)} className="rounded-xl border border-green-800 bg-green-500/10 py-2 text-2xl font-bold text-green-400">{x}</button>)}
        </div>
        <div className="col-span-3 grid gap-1">
          {ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-3 gap-1">
              {row.map((x) => <button type="button" key={x} onClick={() => digit(x)} className="rounded-xl border border-gray-800 bg-gray-900 py-2 text-3xl font-bold">{x}</button>)}
            </div>
          ))}
          <div className="grid grid-cols-3 gap-1">
            <button type="button" onClick={() => digit(0)} className="rounded-xl border border-gray-800 bg-gray-900 py-2 text-3xl font-bold">0</button>
            <button type="button" onClick={plus} className="rounded-xl border border-gray-800 bg-gray-900 py-2 text-2xl font-bold">+</button>
            <button type="button" onClick={enter} className="rounded-xl bg-green-500 py-2 text-xl font-bold text-black">ENTER</button>
          </div>
        </div>
        <div className="grid gap-1">
          {QUICK_RIGHT.map((x) => <button type="button" key={x} onClick={() => choose(x)} className="rounded-xl border border-green-800 bg-green-500/10 py-2 text-2xl font-bold text-green-400">{x}</button>)}
        </div>
      </div>

      {onUndo ? <button type="button" onClick={onUndo} disabled={!canUndo} className="w-full rounded-xl border border-gray-700 bg-gray-900 py-2 font-bold disabled:opacity-40">UNDO</button> : null}
    </div>
  );
}
