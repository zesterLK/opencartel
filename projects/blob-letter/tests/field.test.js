import {test} from 'node:test';import assert from 'node:assert/strict';import {createFluidField} from '../src/fluid-field.js';
test('a pointer impulse deforms the field and settles without nonfinite values',()=>{const field=createFluidField(24);field.impulse(12,12,2,-2);let peak=field.step(1);assert.ok(peak>0);let energy;for(let i=0;i<160;i++)energy=field.step(1);assert.ok(energy<peak);assert.ok([...field.x,...field.y].every(Number.isFinite));});
test('an idle field remains still',()=>{const field=createFluidField(24);assert.equal(field.step(1),0)});
