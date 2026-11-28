import { describe, expect, it } from 'vitest';
import {
  evalFormula, num, parseTarget, gradeInfo, mediaAnual, statusSemestre, aplicaRec,
  type LegacySubject,
} from './engine';

const subject = (): LegacySubject => ({
  nomeDisciplina: 'Fach A – fiktiv',
  provas: [
    { codigoProva: 'P1_1', nota: '6', periodo: { subPeriodo: { codSubPeriodo: '1' } }, formulaNota: '(PR1+DS1)/2' },
    { codigoProva: 'D1_1', nota: '8', periodo: { subPeriodo: { codSubPeriodo: '1' } } },
    { codigoProva: 'P1_2', nota: '4', periodo: { subPeriodo: { codSubPeriodo: '2' } }, formulaNota: '(PR2+DS2)/2' },
    { codigoProva: 'P2_2', nota: null, periodo: { subPeriodo: { codSubPeriodo: '2' } } },
    { codigoProva: 'D1_2', nota: '6', periodo: { subPeriodo: { codSubPeriodo: '2' } } },
  ],
  mediaSubperiodos: [{ nota: '7', periodo: { subPeriodo: { codSubPeriodo: '1' } } }],
});

describe('strikte Zahlen und Ziele', () => {
  it.each(['7abc', 'Infinity', '-Infinity', 'NaN', '7,2.3', '1e309', {}, true])('weist ungültige Zahl %s ab', (value) => {
    expect(() => num(value)).toThrow();
  });
  it.each([NaN, Infinity, -Infinity])('weist nicht endliche Zahlen ab', (value) => expect(() => num(value)).toThrow());
  it('behält fehlende Werte, Null und Dezimalkomma bei', () => {
    expect(num(null)).toBeNull();
    expect(num('')).toBeNull();
    expect(num(' 7,25 ')).toBe(7.25);
    expect(num(0)).toBe(0);
  });
  it('behält Zielwert 0 statt Ersatzwert 6', () => expect(parseTarget('0')).toBe(0));
  it.each(['', '-1', '10.01', 'NaN', '6x'])('weist ungültiges Ziel %s ab', (value) => expect(() => parseTarget(value)).toThrow());
});

describe('strikte Formelsyntax', () => {
  it.each(['1 xyz', '1+', '1/0', 'UNKNOWN(7)', 'UNKNOWN', '(1+2', '1..2', '', 'MIN()', 'ISNULL(1,2)', '1,2', '2 ** 3'])('weist %s ab', (formula) => {
    expect(() => evalFormula(formula, [], '1', null)).toThrow();
  });
  it('berechnet gültige Arithmetik und bekannte Funktionen', () => {
    expect(evalFormula('(6+8)/2', [], '1', null)).toBe(7);
    expect(evalFormula('MIN(8, MAX(2, 6))', [], '1', null)).toBe(6);
    expect(evalFormula('ISNULL(PR1, 5, 8)', [], '1', null)).toBe(5);
    expect(evalFormula('ISNULL(PR1, 5, 8)', [{ codigoProva: 'P1_1', nota: 6 }], '1', null)).toBe(8);
  });
  it('unterscheidet fehlende bekannte Codes von unbekannten Codes', () => {
    expect(evalFormula('P1_1+2', [{ codigoProva: 'P1_1', nota: null }], '1', null)).toBe(2);
    expect(() => evalFormula('MISSING1+2', [], '1', null)).toThrow();
  });
  it('begrenzt übergroße und übermäßig verschachtelte Formeln', () => {
    expect(() => evalFormula('1+'.repeat(3000) + '1', [], '1', null)).toThrow();
    expect(() => evalFormula('('.repeat(100) + '1' + ')'.repeat(100), [], '1', null)).toThrow();
  });
});

describe('bestehende schulgebundene Annahmen', () => {
  it('behält die bisherigen Gruppenanzahlen D=3 und SM=2', () => {
    const items = ['D1_1', 'D2_1', 'D3_1', 'D4_1', 'SM1_1', 'SM2_1', 'SM3_1'].map((codigoProva) => ({ codigoProva, nota: null }));
    expect(gradeInfo(items, 'D', '1').faltam).toBe(3);
    expect(gradeInfo(items, 'SM', '1').faltam).toBe(2);
  });
  it('begrenzt die vorhandene Nachprüfungsregel auf 6', () => {
    const data: LegacySubject = { provas: [
      { codigoProva: 'P1_1', nota: 4 },
      { codigoProva: 'R_1', nota: 9 },
    ] };
    expect(aplicaRec(data, 'PR1', '1')).toMatchObject({ aplica: true, nova: 6 });
  });
  it('kennzeichnet importierte und berechnete Halbjahreswerte', () => {
    expect(statusSemestre(subject(), '1', 6).origin).toBe('imported');
    expect(statusSemestre(subject(), '2', 6).origin).toBe('calculated');
    expect(statusSemestre(subject(), '2', 0).estado).toBe('garantido');
  });
  it('kennzeichnet eine Zielsuche als Simulation und nicht als Schulwert', () => {
    expect(statusSemestre(subject(), '2', 6).projectionOrigin).toBe('simulated');
  });
  it('kennzeichnet selbst berechnete Jahresmittel niemals als importiert', () => {
    const data = subject();
    data.mediaSubperiodos?.push({ nota: 9, periodo: { subPeriodo: { codSubPeriodo: '2' } } });
    expect(mediaAnual(data, 6)).toMatchObject({ media: 8, origin: 'calculated', complete: true });
  });
});
