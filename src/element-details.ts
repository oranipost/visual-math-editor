/** Offline element facts checked against official sources on 2026-10-18.
 * Standard atomic weights: CIAAW 2024, including natural-abundance intervals and
 * parenthetical uncertainties. Bracketed isotope mass numbers: CIAAW's radioactive
 * element table (29 Mar 2022 / NUBASE2020); alternatives are deliberately retained.
 * Configurations: PubChem periodic-table data, except Lr's modern NIST 7p assignment.
 * This is our own factual lookup, not a reproduction of periodic-table artwork.
 */
export interface ElementDetails {
  readonly atomicMass: string;
  readonly massKind: 'standard' | 'isotope';
  readonly electronConfiguration: string;
  readonly electronShells: readonly number[];
  readonly configurationStatus: 'reference' | 'calculated' | 'predicted';
  readonly massSource: string;
  readonly configurationSource: string;
}

export const ELEMENT_DETAIL_SOURCES = Object.freeze({
  standard: 'https://ciaaw.org/atomic-weights.htm',
  isotope: 'https://ciaaw.org/radioactive-elements.htm',
  configuration: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON',
  lawrencium: 'https://physics.nist.gov/cgi-bin/Elements/elInfo.pl?element=103',
});

// Symbol | mass value | value kind | neutral reference configuration | qualifier.
const ELEMENT_DETAIL_ROWS = `
H|[1.00784, 1.00811]|standard|1s1|reference
He|4.002602(2)|standard|1s2|reference
Li|[6.938, 6.997]|standard|[He] 2s1|reference
Be|9.0121831(5)|standard|[He] 2s2|reference
B|[10.806, 10.821]|standard|[He] 2s2 2p1|reference
C|[12.0096, 12.0116]|standard|[He] 2s2 2p2|reference
N|[14.00643, 14.00728]|standard|[He] 2s2 2p3|reference
O|[15.99903, 15.99977]|standard|[He] 2s2 2p4|reference
F|18.998403162(5)|standard|[He] 2s2 2p5|reference
Ne|20.1797(6)|standard|[He] 2s2 2p6|reference
Na|22.98976928(2)|standard|[Ne] 3s1|reference
Mg|[24.304, 24.307]|standard|[Ne] 3s2|reference
Al|26.9815384(3)|standard|[Ne] 3s2 3p1|reference
Si|[28.084, 28.086]|standard|[Ne] 3s2 3p2|reference
P|30.973761998(5)|standard|[Ne] 3s2 3p3|reference
S|[32.059, 32.076]|standard|[Ne] 3s2 3p4|reference
Cl|[35.446, 35.457]|standard|[Ne] 3s2 3p5|reference
Ar|[39.792, 39.963]|standard|[Ne] 3s2 3p6|reference
K|39.0983(1)|standard|[Ar] 4s1|reference
Ca|40.078(4)|standard|[Ar] 4s2|reference
Sc|44.955907(4)|standard|[Ar] 4s2 3d1|reference
Ti|47.867(1)|standard|[Ar] 4s2 3d2|reference
V|50.9415(1)|standard|[Ar] 4s2 3d3|reference
Cr|51.9961(6)|standard|[Ar] 3d5 4s1|reference
Mn|54.938043(2)|standard|[Ar] 4s2 3d5|reference
Fe|55.845(2)|standard|[Ar] 4s2 3d6|reference
Co|58.933194(3)|standard|[Ar] 4s2 3d7|reference
Ni|58.6934(4)|standard|[Ar] 4s2 3d8|reference
Cu|63.546(3)|standard|[Ar] 4s1 3d10|reference
Zn|65.38(2)|standard|[Ar] 4s2 3d10|reference
Ga|69.723(1)|standard|[Ar] 4s2 3d10 4p1|reference
Ge|72.630(8)|standard|[Ar] 4s2 3d10 4p2|reference
As|74.921595(6)|standard|[Ar] 4s2 3d10 4p3|reference
Se|78.971(8)|standard|[Ar] 4s2 3d10 4p4|reference
Br|[79.901, 79.907]|standard|[Ar] 4s2 3d10 4p5|reference
Kr|83.798(2)|standard|[Ar] 4s2 3d10 4p6|reference
Rb|85.4678(3)|standard|[Kr] 5s1|reference
Sr|87.62(1)|standard|[Kr] 5s2|reference
Y|88.905838(2)|standard|[Kr] 5s2 4d1|reference
Zr|91.222(3)|standard|[Kr] 5s2 4d2|reference
Nb|92.90637(1)|standard|[Kr] 5s1 4d4|reference
Mo|95.95(1)|standard|[Kr] 5s1 4d5|reference
Tc|[97] / [98]|isotope|[Kr] 5s2 4d5|reference
Ru|101.07(2)|standard|[Kr] 5s1 4d7|reference
Rh|102.90549(2)|standard|[Kr] 5s1 4d8|reference
Pd|106.42(1)|standard|[Kr] 4d10|reference
Ag|107.8682(2)|standard|[Kr] 5s1 4d10|reference
Cd|112.414(4)|standard|[Kr] 5s2 4d10|reference
In|114.818(1)|standard|[Kr] 5s2 4d10 5p1|reference
Sn|118.710(7)|standard|[Kr] 5s2 4d10 5p2|reference
Sb|121.760(1)|standard|[Kr] 5s2 4d10 5p3|reference
Te|127.60(3)|standard|[Kr] 5s2 4d10 5p4|reference
I|126.90447(3)|standard|[Kr] 5s2 4d10 5p5|reference
Xe|131.293(6)|standard|[Kr] 5s2 4d10 5p6|reference
Cs|132.90545196(6)|standard|[Xe] 6s1|reference
Ba|137.327(7)|standard|[Xe] 6s2|reference
La|138.90547(7)|standard|[Xe] 6s2 5d1|reference
Ce|140.116(1)|standard|[Xe] 6s2 4f1 5d1|reference
Pr|140.90766(1)|standard|[Xe] 6s2 4f3|reference
Nd|144.242(3)|standard|[Xe] 6s2 4f4|reference
Pm|[145]|isotope|[Xe] 6s2 4f5|reference
Sm|150.36(2)|standard|[Xe] 6s2 4f6|reference
Eu|151.964(1)|standard|[Xe] 6s2 4f7|reference
Gd|157.249(2)|standard|[Xe] 6s2 4f7 5d1|reference
Tb|158.925354(7)|standard|[Xe] 6s2 4f9|reference
Dy|162.500(1)|standard|[Xe] 6s2 4f10|reference
Ho|164.930329(5)|standard|[Xe] 6s2 4f11|reference
Er|167.259(3)|standard|[Xe] 6s2 4f12|reference
Tm|168.934219(5)|standard|[Xe] 6s2 4f13|reference
Yb|173.045(10)|standard|[Xe] 6s2 4f14|reference
Lu|174.96669(5)|standard|[Xe] 6s2 4f14 5d1|reference
Hf|178.486(6)|standard|[Xe] 6s2 4f14 5d2|reference
Ta|180.94788(2)|standard|[Xe] 6s2 4f14 5d3|reference
W|183.84(1)|standard|[Xe] 6s2 4f14 5d4|reference
Re|186.207(1)|standard|[Xe] 6s2 4f14 5d5|reference
Os|190.23(3)|standard|[Xe] 6s2 4f14 5d6|reference
Ir|192.217(2)|standard|[Xe] 6s2 4f14 5d7|reference
Pt|195.084(9)|standard|[Xe] 6s1 4f14 5d9|reference
Au|196.966570(4)|standard|[Xe] 6s1 4f14 5d10|reference
Hg|200.592(3)|standard|[Xe] 6s2 4f14 5d10|reference
Tl|[204.382, 204.385]|standard|[Xe] 6s2 4f14 5d10 6p1|reference
Pb|[206.14, 207.94]|standard|[Xe] 6s2 4f14 5d10 6p2|reference
Bi|208.98040(1)|standard|[Xe] 6s2 4f14 5d10 6p3|reference
Po|[209]|isotope|[Xe] 6s2 4f14 5d10 6p4|reference
At|[210]|isotope|[Xe] 6s2 4f14 5d10 6p5|reference
Rn|[222]|isotope|[Xe] 6s2 4f14 5d10 6p6|reference
Fr|[223]|isotope|[Rn] 7s1|reference
Ra|[226]|isotope|[Rn] 7s2|reference
Ac|[227]|isotope|[Rn] 7s2 6d1|reference
Th|232.0377(4)|standard|[Rn] 7s2 6d2|reference
Pa|231.03588(1)|standard|[Rn] 7s2 5f2 6d1|reference
U|238.02891(3)|standard|[Rn] 7s2 5f3 6d1|reference
Np|[237]|isotope|[Rn] 7s2 5f4 6d1|reference
Pu|[244]|isotope|[Rn] 7s2 5f6|reference
Am|[243]|isotope|[Rn] 7s2 5f7|reference
Cm|[247]|isotope|[Rn] 7s2 5f7 6d1|reference
Bk|[247]|isotope|[Rn] 7s2 5f9|reference
Cf|[251]|isotope|[Rn] 7s2 5f10|reference
Es|[252]|isotope|[Rn] 7s2 5f11|reference
Fm|[257]|isotope|[Rn] 5f12 7s2|reference
Md|[258]|isotope|[Rn] 7s2 5f13|reference
No|[259]|isotope|[Rn] 7s2 5f14|reference
Lr|[262] / [266]|isotope|[Rn] 5f14 7s2 7p1|reference
Rf|[267]|isotope|[Rn] 7s2 5f14 6d2|reference
Db|[268]|isotope|[Rn] 7s2 5f14 6d3|reference
Sg|[269] / [271]|isotope|[Rn] 7s2 5f14 6d4|reference
Bh|[270] / [274]|isotope|[Rn] 7s2 5f14 6d5|reference
Hs|[269] / [270]|isotope|[Rn] 7s2 5f14 6d6|reference
Mt|[277] / [278]|isotope|[Rn] 7s2 5f14 6d7|calculated
Ds|[281]|isotope|[Rn] 7s2 5f14 6d8|predicted
Rg|[282]|isotope|[Rn] 7s2 5f14 6d9|predicted
Cn|[285]|isotope|[Rn] 7s2 5f14 6d10|predicted
Nh|[285] / [286]|isotope|[Rn] 5f14 6d10 7s2 7p1|predicted
Fl|[289] / [290]|isotope|[Rn] 7s2 7p2 5f14 6d10|predicted
Mc|[288] / [289] / [290]|isotope|[Rn] 7s2 7p3 5f14 6d10|predicted
Lv|[291] / [292] / [293]|isotope|[Rn] 7s2 7p4 5f14 6d10|predicted
Ts|[294]|isotope|[Rn] 7s2 7p5 5f14 6d10|predicted
Og|[294]|isotope|[Rn] 7s2 7p6 5f14 6d10|predicted
`.trim();

const rows = ELEMENT_DETAIL_ROWS.split('\n').map((row) => row.split('|'));
const configurations = new Map(rows.map(([symbol, , , configuration]) => [symbol, configuration]));

/** Expand noble-gas cores, then group orbital populations by principal shell.
 * No Aufbau filling approximation is used, so Cr/Cu/Pd and other exceptions in
 * the source assignment retain their actual reference occupancies.
 */
function countElectronShells(configuration: string, trail: readonly string[] = []): readonly number[] {
  const shells: number[] = [];
  let remainder = configuration;
  const core = /^\[([A-Z][a-z]?)\]/.exec(remainder);
  if (core) {
    const coreConfiguration = configurations.get(core[1]);
    if (!coreConfiguration || trail.includes(core[1])) throw new Error('Invalid noble-gas core.');
    shells.push(...countElectronShells(coreConfiguration, [...trail, core[1]]));
    remainder = remainder.slice(core[0].length);
  }
  const orbitalPattern = /([1-7])([spdf])(\d{1,2})/g;
  for (const match of remainder.matchAll(orbitalPattern)) {
    const principal = Number(match[1]);
    const population = Number(match[3]);
    const capacity = { s: 2, p: 6, d: 10, f: 14 }[match[2]];
    if (capacity === undefined || population < 1 || population > capacity) throw new Error('Invalid orbital occupancy.');
    shells[principal - 1] = (shells[principal - 1] ?? 0) + population;
  }
  if (remainder.replace(orbitalPattern, '').trim()) throw new Error('Unsupported electron configuration.');
  return Object.freeze(Array.from(shells, (population) => population ?? 0));
}

export const ELEMENT_DETAILS: Readonly<Record<string, ElementDetails>> = Object.freeze(
  Object.fromEntries(rows.map(([symbol, atomicMass, massKind, electronConfiguration, configurationStatus]) => {
    const details: ElementDetails = Object.freeze({
      atomicMass,
      massKind: massKind as ElementDetails['massKind'],
      electronConfiguration,
      electronShells: countElectronShells(electronConfiguration),
      configurationStatus: configurationStatus as ElementDetails['configurationStatus'],
      massSource: massKind === 'standard' ? ELEMENT_DETAIL_SOURCES.standard : ELEMENT_DETAIL_SOURCES.isotope,
      configurationSource: symbol === 'Lr' ? ELEMENT_DETAIL_SOURCES.lawrencium : ELEMENT_DETAIL_SOURCES.configuration,
    });
    return [symbol, details];
  })),
);

/** Unknown strings do not fall through to inherited Object properties. */
export function getElementDetails(symbol: string): ElementDetails | undefined {
  return Object.hasOwn(ELEMENT_DETAILS, symbol) ? ELEMENT_DETAILS[symbol] : undefined;
}
