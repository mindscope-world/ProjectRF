import React from 'react';

export const UsaDomesticSeal: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* Outer border with concentric rings */}
        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#003399" strokeWidth="3" />
        <circle cx="50" cy="50" r="43" fill="#ffffff" stroke="#cc0000" strokeWidth="1.5" strokeDasharray="3,1.5" />
        
        {/* Top 3 Stars */}
        <g fill="#003399">
          <polygon points="36,25 38,20 40,25 35,22 41,22" />
          <polygon points="50,22 52,17 54,22 49,19 55,19" />
          <polygon points="64,25 66,20 68,25 63,22 69,22" />
        </g>
        
        {/* USA text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fontFamily="Impact, Arial Black, sans-serif"
          fill="#0b3882"
          letterSpacing="1"
        >
          USA
        </text>
        
        {/* Curved ribbon background */}
        <path
          d="M 12,68 C 25,60 75,60 88,68 L 84,82 C 70,74 30,74 16,82 Z"
          fill="#cc1111"
          stroke="#880000"
          strokeWidth="0.5"
        />
        
        {/* Ribbon banner text */}
        <text
          x="50"
          y="76"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fontFamily="Arial, sans-serif"
          fill="#ffffff"
          letterSpacing="1.2"
        >
          DOMESTIC
        </text>
      </svg>
    </div>
  );
};

export const ProductArtwork: React.FC<{ imageKey: string; name: string }> = ({ imageKey }) => {
  switch (imageKey) {
    case 'phentermine':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-bold text-gray-500">IFA</span>
              <span className="text-[8px] bg-teal-600 text-white px-1 py-0.5 rounded font-bold">Fentermina</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-xl font-black italic text-cyan-700 tracking-tighter drop-shadow-xs">acxion</div>
              <div className="text-[10px] font-bold text-gray-700">30 mg</div>
              <div className="text-[8px] text-gray-500 font-medium mt-0.5">for ADHD & weight loss</div>
            </div>
            <div className="flex justify-between items-end border-t border-cyan-100 pt-1">
              <span className="text-[7px] text-gray-400">caja con 30 tabletas</span>
              <span className="text-[7px] font-bold text-teal-800">ifa CELTICS</span>
            </div>
            <div className="absolute top-0 right-0 w-8 h-8 bg-linear-to-bl from-cyan-400 to-transparent opacity-40"></div>
          </div>
        </div>
      );

    case 'strattera':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-32 h-36 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col p-2.5">
            <div className="text-[7px] text-gray-500 font-semibold">28 Hartkapseln / 28 Capsules</div>
            <div className="mt-3">
              <div className="text-sm font-black text-gray-900 leading-tight">strattera<span className="text-[10px] font-normal">®</span></div>
              <div className="text-xs font-bold text-blue-800">40 mg</div>
              <div className="text-[8px] text-gray-500 italic mt-0.5">Atomoxetinum</div>
            </div>
            <div className="mt-auto pt-2 border-t border-gray-200 flex items-center justify-between">
              <div className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center text-[7px] text-white font-bold">Lilly</div>
              <div className="text-[7px] text-gray-400">40 mg</div>
            </div>
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
          </div>
        </div>
      );

    case 'modalert':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-white to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden rotate-[-12deg] p-2 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-gray-200 pb-1">
              <span className="text-[8px] font-black text-red-600 tracking-wider">SUN PHARMA</span>
              <span className="text-[7px] text-gray-500">10 x 10 Tabs</span>
            </div>
            <div className="text-center">
              <div className="text-xs font-black text-gray-800">Modalert 200</div>
              <div className="text-[8px] text-gray-600 font-medium">Modafinil Tablets USP 200 mg</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-gray-200">
              <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-gray-100 border border-gray-300 shadow-inner"></div>
            </div>
            <div className="absolute -right-6 -top-6 w-12 h-12 bg-red-500 opacity-20 rotate-45"></div>
          </div>
        </div>
      );

    case 'modvigil':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-slate-100 to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden rotate-[-12deg] p-2 flex flex-col justify-between">
            <div className="bg-purple-700 text-white text-[8px] font-bold px-2 py-0.5 rounded -mx-1 flex justify-between items-center">
              <span>HAB PHARMA</span>
              <span>Modvigil-200</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-xs font-black text-purple-900">Modvigil 200</div>
              <div className="text-[8px] text-gray-600">Modafinil Tablets USP 200 mg</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-purple-200">
              <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-purple-100 border border-purple-300 shadow-inner"></div>
            </div>
          </div>
        </div>
      );

    case 'modasafe':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-right text-gray-500 font-bold">10x10 Tablets</div>
            <div className="my-auto">
              <div className="text-[9px] font-semibold text-gray-700">Modafinil Tablets 300 mg</div>
              <div className="text-sm font-black text-sky-800 tracking-wide mt-0.5">MODASAFE-300</div>
            </div>
            <div className="h-2 w-full bg-linear-to-r from-sky-400 via-amber-400 to-sky-600 rounded-full"></div>
          </div>
        </div>
      );

    case 'modasmart':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-right text-gray-500 font-bold">10 x 10 Tablets</div>
            <div className="my-auto">
              <div className="text-[9px] font-medium text-gray-600">Modafinil Tablets USP 400 mg</div>
              <div className="text-sm font-black text-rose-800 tracking-wide">MODASMART 400</div>
            </div>
            <div className="h-1.5 w-full bg-rose-600 rounded"></div>
          </div>
        </div>
      );

    case 'waklert':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-white to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden rotate-[-12deg] p-2 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[8px] font-bold text-emerald-700 border-b border-gray-200 pb-0.5">
              <span>SUN PHARMA</span>
              <span>Armodafinil</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-xs font-black text-emerald-800">Waklert 150</div>
              <div className="text-[8px] text-gray-600 font-medium">Armodafinil Tablets 150 mg</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-emerald-200">
              <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 shadow-inner"></div>
              <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 shadow-inner"></div>
            </div>
          </div>
        </div>
      );

    case 'artvigil-150':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-white to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden rotate-[-12deg] p-2 flex flex-col justify-between">
            <div className="bg-linear-to-r from-purple-800 to-indigo-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded -mx-1">
              HAB PHARMA • ARTVIGIL-150
            </div>
            <div className="text-center my-auto">
              <div className="text-xs font-black text-purple-900">Artvigil 150</div>
              <div className="text-[8px] text-gray-600">Armodafinil Tablets 150 mg</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-purple-200">
              <div className="w-4 h-4 rounded-full bg-purple-50 border border-purple-300"></div>
              <div className="w-4 h-4 rounded-full bg-purple-50 border border-purple-300"></div>
              <div className="w-4 h-4 rounded-full bg-purple-50 border border-purple-300"></div>
            </div>
          </div>
        </div>
      );

    case 'artvigil-250':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-white to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden rotate-[-12deg] p-2 flex flex-col justify-between">
            <div className="bg-linear-to-r from-gray-900 to-red-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded -mx-1">
              HAB PHARMA • ARTVIGIL-250
            </div>
            <div className="text-center my-auto">
              <div className="text-xs font-black text-red-950">Artvigil 250</div>
              <div className="text-[8px] text-gray-600">Armodafinil Tablets 250 mg</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-red-200">
              <div className="w-4 h-4 rounded-full bg-red-50 border border-red-300"></div>
              <div className="w-4 h-4 rounded-full bg-red-50 border border-red-300"></div>
              <div className="w-4 h-4 rounded-full bg-red-50 border border-red-300"></div>
            </div>
          </div>
        </div>
      );

    case 'nitrazepam':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-center text-[7px] text-gray-500">
              <span>Rx</span>
              <span>20 x 10 Tablets</span>
            </div>
            <div className="my-auto">
              <div className="text-xs font-bold text-gray-800">Nitrazepam Tablets IP 10 mg</div>
              <div className="text-sm font-black text-sky-800">Elza-10</div>
            </div>
            <div className="h-1.5 w-full bg-sky-600 rounded"></div>
          </div>
        </div>
      );

    case 'xanax-1mg':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-tr from-gray-200 via-white to-gray-200 border border-gray-300 rounded shadow-md relative overflow-hidden p-2 flex flex-col justify-between">
            <div className="flex justify-between items-center text-[7px] text-gray-500 font-bold">
              <span>NRX</span>
              <span>12 x 5 x 10 Tablets</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-[9px] font-bold text-gray-700">Alprazolam Tablets I.P. 1 mg</div>
              <div className="text-xs font-black text-indigo-900 tracking-wider">PROCALM-1</div>
            </div>
            <div className="flex justify-around items-center pt-1 border-t border-gray-200">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-100 border border-blue-300"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-100 border border-blue-300"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-100 border border-blue-300"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-blue-100 border border-blue-300"></div>
            </div>
          </div>
        </div>
      );

    case 'xanax-bars':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="flex items-center gap-2">
            {/* White rectangular bar 1 */}
            <div className="w-8 h-24 bg-white border border-gray-300 rounded-sm shadow-md flex flex-col justify-around items-center py-1">
              <span className="text-[9px] font-bold text-gray-700">G</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">G</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">2</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">49</span>
            </div>
            {/* White rectangular bar 2 */}
            <div className="w-8 h-24 bg-white border border-gray-300 rounded-sm shadow-md flex flex-col justify-around items-center py-1">
              <span className="text-[9px] font-bold text-gray-700">U</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">9</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">4</span>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <span className="text-[9px] font-bold text-gray-700">•</span>
            </div>
          </div>
        </div>
      );

    case 'farmapram':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="flex items-center gap-2">
            {/* Amber bottle */}
            <div className="w-16 h-28 bg-linear-to-b from-amber-800 to-amber-950 rounded-b-lg rounded-t-sm shadow-md border border-amber-900 relative flex flex-col items-center p-1">
              <div className="w-10 h-3 bg-white rounded-t-sm border border-gray-300"></div>
              <div className="w-14 h-16 bg-white rounded-xs mt-2 p-1 flex flex-col justify-center text-center">
                <span className="text-[8px] font-black text-gray-900">Farmapram</span>
                <span className="text-[7px] text-gray-700 font-bold">2.0 mg</span>
                <span className="text-[5px] text-gray-500">Alprazolam 90 tab</span>
              </div>
            </div>
            {/* White bar */}
            <div className="w-6 h-20 bg-white border border-gray-300 rounded-xs shadow flex flex-col justify-around items-center py-1">
              <div className="w-full h-[1px] bg-gray-200"></div>
              <div className="w-full h-[1px] bg-gray-200"></div>
              <div className="w-full h-[1px] bg-gray-200"></div>
            </div>
          </div>
        </div>
      );

    case 'clonazepam':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-purple-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] font-bold text-purple-900">TEMPUS PHARMA</div>
            <div className="my-auto">
              <div className="text-xs font-black text-gray-900">Clonazepam</div>
              <div className="text-[9px] font-bold text-purple-700">Tableta 2mg</div>
              <div className="text-[6px] text-gray-500">Caja con 30 tabletas</div>
            </div>
            <div className="h-1.5 w-full bg-purple-600 rounded"></div>
          </div>
        </div>
      );

    case 'bensedin':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-red-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-center text-[7px] text-gray-500">
              <span>Galenika</span>
              <span className="text-red-600 font-bold">30 tablets</span>
            </div>
            <div className="my-auto">
              <div className="text-xs font-black text-gray-900">Bensedin<span className="text-[8px] font-normal">®</span> 10 mg tableta</div>
              <div className="text-[8px] text-gray-600">Diazepam 10 mg</div>
            </div>
            <div className="h-1.5 w-full bg-red-600 rounded"></div>
          </div>
        </div>
      );

    case 'ativan':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-36 h-28 bg-white border border-gray-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-gray-500 font-bold">A 50</div>
            <div className="my-auto">
              <div className="text-sm font-black text-blue-900">Ativan</div>
              <div className="text-[8px] text-gray-600">(Lorazepam)</div>
              <div className="text-[9px] font-bold text-blue-700">2mg</div>
              <div className="text-[7px] text-gray-500 mt-1">100 TABLETS</div>
            </div>
            <div className="h-1.5 w-full bg-blue-700 rounded"></div>
          </div>
        </div>
      );

    case 'zolpidem':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-white border border-cyan-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] font-bold text-sky-800">SANDOZ A Novartis Division</div>
            <div className="my-auto">
              <div className="text-xs font-black text-gray-900">Zolpidem Sandoz<span className="text-[8px]">®</span> 10 mg</div>
              <div className="text-[8px] text-gray-600">10 Filmomhulde tabletten</div>
            </div>
            <div className="h-2 w-full bg-linear-to-r from-sky-400 via-sky-600 to-sky-800 rounded"></div>
          </div>
        </div>
      );

    case 'zopiclone':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-slate-800 border border-slate-900 text-white rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-gray-300 font-bold">10 x 14 Tablets</div>
            <div className="my-auto">
              <div className="text-[9px] font-bold text-sky-400">ZOPICLONE TABLETS</div>
              <div className="text-xs font-black tracking-wide text-white">Zopisign 10mg</div>
            </div>
            <div className="h-1.5 w-full bg-sky-500 rounded"></div>
          </div>
        </div>
      );

    case 'tramadol':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-teal-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] font-bold text-teal-800">NL</div>
            <div className="my-auto">
              <div className="text-sm font-black text-gray-900">Tramadol</div>
              <div className="text-[8px] text-teal-700 font-medium">Tramadol HCl</div>
              <div className="text-[7px] text-gray-500 mt-1">10 x 10 Capsules</div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-5 h-2 rounded-full bg-linear-to-r from-emerald-500 to-yellow-400 border border-gray-400"></div>
              <div className="w-5 h-2 rounded-full bg-linear-to-r from-emerald-500 to-yellow-400 border border-gray-400"></div>
            </div>
          </div>
        </div>
      );

    case 'tapentadol':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-amber-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-gray-500 font-bold">10 x 10 Tablets</div>
            <div className="my-auto">
              <div className="text-[8px] font-bold text-gray-700">TAPENTADOL TABLET 100 MG</div>
              <div className="text-xs font-black text-amber-900">Aspadol® Tab</div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
            </div>
          </div>
        </div>
      );

    case 'soma':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-blue-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-center text-[7px] font-bold text-gray-500">
              <span>HAB</span>
              <span>10 X 10 Tablets</span>
            </div>
            <div className="my-auto">
              <div className="text-[8px] font-semibold text-gray-600">Carisoprodol Tablets IP</div>
              <div className="text-xs font-black text-blue-900">Pain-O-Soma</div>
              <div className="text-[9px] font-bold text-red-600">350 mg</div>
            </div>
            <div className="h-1.5 w-full bg-linear-to-r from-blue-600 to-red-600 rounded"></div>
          </div>
        </div>
      );

    case 'viagra':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-blue-300 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-center text-[7px] text-gray-600 font-bold">
              <span>Rx</span>
              <span>10 X 10 Tablets</span>
            </div>
            <div className="my-auto">
              <div className="text-[8px] text-gray-700">Sildenafil Citrate Tablets IP 100mg</div>
              <div className="text-xs font-black text-blue-900 tracking-wide">Cenforce®-100</div>
              <div className="text-[7px] font-bold text-gray-600 mt-0.5">सेनफोर्स-१००</div>
            </div>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-blue-600 rotate-45 border border-blue-800"></div>
              <div className="w-3 h-3 bg-blue-600 rotate-45 border border-blue-800"></div>
              <div className="w-3 h-3 bg-blue-600 rotate-45 border border-blue-800"></div>
            </div>
          </div>
        </div>
      );

    case 'cialis':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-amber-700 border border-amber-800 text-white rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="text-[7px] text-amber-200 font-bold">10 x 10 Tablets</div>
            <div className="my-auto">
              <div className="text-xs font-black tracking-wide text-white">VIDALISTA 20</div>
              <div className="text-[8px] text-amber-100">Tadalafil Tablets 20mg</div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
            </div>
          </div>
        </div>
      );

    case 'gabapentin':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-yellow-400 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="h-2 w-full bg-yellow-400"></div>
            <div className="my-auto">
              <div className="text-[8px] text-gray-600">Gabapentin HEXAL® 800 mg</div>
              <div className="text-sm font-black text-gray-900">800 mg</div>
              <div className="text-[7px] text-gray-500">50 Filmtabletten N1</div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-bold text-blue-900">HEXAL</span>
              <span className="text-[7px] text-gray-400">Rx only</span>
            </div>
          </div>
        </div>
      );

    case 'lyrica':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-38 h-28 bg-white border border-blue-200 rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2">
            <div className="flex justify-between items-center">
              <div className="w-6 h-3 rounded-full bg-blue-700 flex items-center justify-center text-[6px] text-white font-bold">Pfizer</div>
              <span className="text-[7px] text-gray-500">Rx</span>
            </div>
            <div className="my-auto">
              <div className="text-sm font-black text-blue-950 tracking-wider">LYRICA<span className="text-[8px]">®</span></div>
              <div className="text-[8px] text-gray-600 font-medium">Pregabalina Cápsulas 300 mg</div>
            </div>
            <div className="h-1.5 w-full bg-blue-600 rounded"></div>
          </div>
        </div>
      );

    case 'kamagra':
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 relative bg-linear-to-b from-slate-50 to-slate-100 rounded-lg">
          <div className="w-40 h-28 bg-linear-to-br from-emerald-600 via-teal-700 to-green-800 text-white rounded shadow-md relative overflow-hidden flex flex-col justify-between p-2 border border-emerald-500">
            <div className="flex justify-between items-center text-[7px] font-bold text-amber-200">
              <span className="bg-emerald-900/80 px-1 py-0.2 rounded">Ajanta Pharma</span>
              <span className="text-yellow-300">100 mg</span>
            </div>
            <div className="my-auto text-center">
              <div className="text-sm font-black tracking-wider text-white drop-shadow-xs">
                KAMAGRA<span className="text-[9px] text-amber-300">®</span>
              </div>
              <div className="text-[10px] font-bold text-amber-300 tracking-tight">ORAL JELLY 100mg</div>
              <div className="text-[7px] text-emerald-100 mt-0.5">Sildenafil Citrate • Assorted Flavours</div>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-emerald-500/50">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-2xs" title="Pineapple"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block shadow-2xs" title="Orange"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block shadow-2xs" title="Strawberry"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 inline-block shadow-2xs" title="Banana"></span>
              </div>
              <span className="text-[7px] bg-amber-400 text-emerald-950 font-black px-1.5 py-0.5 rounded-xs">7 SACHETS</span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="w-full h-48 flex items-center justify-center p-2 bg-slate-100 rounded-lg">
          <div className="text-gray-400 text-xs font-semibold">Medicine Package</div>
        </div>
      );
  }
};
