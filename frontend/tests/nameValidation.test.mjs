import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/utils/nameValidation.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { validName, registrationNameError } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('accepts Unicode letters and spaces', () => {
    for (const name of [' José ', 'Dela Cruz', '李', 'Jose\u0301']) assert.equal(validName(name), true, name);
    assert.equal(registrationNameError(' Ana ', '', 'Dela Cruz'), null);
});

test('rejects digits, invalid characters and missing required names', () => {
    for (const name of ['123', 'Juan2', '2Maria', '١٢', 'Ana@', '---', ' ', "O'Neil", 'Jean-Luc', 'D’Arcy']) assert.equal(validName(name), false, name);
    assert.notEqual(registrationNameError('Ana', 'Middle2', 'Cruz'), null);
    assert.notEqual(registrationNameError('', '', 'Cruz'), null);
    assert.equal(validName('', false), true);
});
